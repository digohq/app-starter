'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  RICH_TEXT_ALLOWED_URL_SCHEMES,
  isRichTextHtml,
  plainTextToRichTextHtml,
  richTextToPlainText,
} from '@app-starter/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RichTextEditorVariant = 'inline' | 'full';

export interface RichTextEditorProps {
  /** Stored HTML value. Legacy plain text is accepted and parsed as a single paragraph. */
  value: string;
  /** Called with the editor's HTML on every content change. */
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** `full` enables headings, lists and blockquotes; `inline` is bold/italic/link only. */
  variant?: RichTextEditorVariant;
  /** When set, a plain-text character counter is shown under the editor. */
  maxLength?: number;
  disabled?: boolean;
  /** Place the caret at the end of the content on mount (click-to-edit surfaces). */
  autoFocus?: boolean;
  ariaLabel?: string;
  id?: string;
  /**
   * Wired through to the contenteditable so `FormControl` (a Radix `Slot`) can link the field
   * to its `FormMessage`/`FormDescription`, as the `<Textarea>` this replaced did via DOM props.
   */
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'true' | 'false';
}

/**
 * Normalize a URL typed into the link prompt.
 *
 * A scheme-less host (`example.com`) becomes `https://example.com`; anything whose scheme is
 * outside {@link RICH_TEXT_ALLOWED_URL_SCHEMES} is rejected with `null`.
 */
export const normalizeRichTextLinkHref = (input: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);
  if (!schemeMatch) {
    // Protocol-relative URLs (`//example.com`) inherit the page scheme — treat as https.
    const withoutLeadingSlashes = trimmed.replace(/^\/{2}/, '');
    if (!withoutLeadingSlashes) return null;
    return `https://${withoutLeadingSlashes}`;
  }

  const scheme = schemeMatch[1].toLowerCase();
  const isAllowed = (RICH_TEXT_ALLOWED_URL_SCHEMES as readonly string[]).includes(scheme);
  if (!isAllowed) return null;

  return trimmed;
};

/**
 * Attributes worth preserving on pasted markup. Everything else (`class`, `id`, `lang`, `align`,
 * every `on*` handler, …) is dropped before ProseMirror sees the clipboard HTML.
 */
const PASTE_KEPT_ATTRIBUTES: Record<string, readonly string[]> = {
  a: ['href', 'title'],
};

/**
 * CSS properties the editor schema actually consumes. Google Docs and Word carry emphasis as
 * `<span style="font-weight:700">` / `font-style:italic`, which TipTap's `{ style: … }` parse
 * rules turn into marks — so these must survive the cleanup or the emphasis is lost.
 */
const PASTE_KEPT_STYLE_PROPERTIES = new Set([
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-line',
]);

const filterPastedStyle = (style: string): string =>
  style
    .split(';')
    .map((declaration) => declaration.trim())
    .filter((declaration) => {
      const separator = declaration.indexOf(':');
      if (separator <= 0) return false;
      return PASTE_KEPT_STYLE_PROPERTIES.has(declaration.slice(0, separator).trim().toLowerCase());
    })
    .join('; ');

/** Replace an element with its children, keeping the text and any marks inside it. */
const unwrapElement = (element: Element): void => {
  const parent = element.parentNode;
  if (!parent) return;
  while (element.firstChild) parent.insertBefore(element.firstChild, element);
  parent.removeChild(element);
};

/**
 * Strip presentational noise from pasted markup (Google Docs, Word) while keeping the structure
 * and emphasis TipTap knows how to parse.
 *
 * Blanket-stripping `style` would break two things Google Docs depends on: the
 * `<b style="font-weight:normal" id="docs-internal-guid-…">` wrapper it puts around every copy
 * (whose `font-weight:normal` is exactly how TipTap's bold rule knows not to bold the whole
 * paste), and the `<span style="font-weight:700|font-style:italic">` runs that carry the real
 * emphasis. So the wrapper is unwrapped explicitly and only the style properties the schema
 * consumes are kept. Nothing survives into storage: TipTap re-serializes from its own schema, and
 * the API sanitizer allows attributes on anchors only.
 */
export const cleanPastedHtml = (html: string): string => {
  if (typeof DOMParser === 'undefined') return html;

  const doc = new DOMParser().parseFromString(html.replace(/<!--[\s\S]*?-->/g, ''), 'text/html');
  const { body } = doc;
  if (!body) return html;

  body.querySelectorAll('script, style, meta, link, title').forEach((element) => element.remove());

  // The Google Docs clipboard wrapper — unwrap it before it can be mistaken for real emphasis.
  body.querySelectorAll('[id^="docs-internal-guid"]').forEach(unwrapElement);

  body.querySelectorAll('*').forEach((element) => {
    const kept = PASTE_KEPT_ATTRIBUTES[element.tagName.toLowerCase()] ?? [];

    for (const name of Array.from(element.attributes, (attribute) => attribute.name)) {
      if (kept.includes(name.toLowerCase())) continue;

      if (name.toLowerCase() === 'style') {
        const style = filterPastedStyle(element.getAttribute('style') ?? '');
        if (style) element.setAttribute('style', style);
        else element.removeAttribute('style');
        continue;
      }

      element.removeAttribute(name);
    }
  });

  // Wrappers that no longer carry anything the schema reads are pure noise.
  body.querySelectorAll('span, font').forEach((element) => {
    if (!element.hasAttribute('style')) unwrapElement(element);
  });

  return body.innerHTML;
};

const isEditorEmptyHtml = (html: string): boolean =>
  html.replace(/<[^>]*>/g, '').trim().length === 0;

/**
 * Coerce a stored value into HTML before it reaches ProseMirror.
 *
 * Rows written before rich text shipped — and plain text pushed in by AI autofill — carry their
 * structure in newlines. ProseMirror collapses whitespace when parsing HTML, so handing it such a
 * value verbatim would flatten every paragraph on the next save.
 */
const toEditorHtml = (value: string | null | undefined): string => {
  if (!value) return '';
  if (isRichTextHtml(value)) return value;
  return plainTextToRichTextHtml(value) ?? '';
};

interface ToolbarButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

const ToolbarButton = ({ label, isActive, onClick, disabled, children }: ToolbarButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    title={label}
    aria-label={label}
    aria-pressed={isActive}
    disabled={disabled}
    className={cn(isActive && 'bg-accent')}
    onClick={onClick}
  >
    {children}
  </Button>
);

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  variant = 'full',
  maxLength,
  disabled = false,
  autoFocus = false,
  ariaLabel,
  id,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: RichTextEditorProps) {
  const isInline = variant === 'inline';

  const extensions = useMemo(() => {
    const starterKit = isInline
      ? StarterKit.configure({
          // The inline schema has no block structure, so pasted headings/lists are
          // flattened into paragraphs instead of being dropped by the API sanitizer.
          heading: false,
          link: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
        })
      : StarterKit.configure({
          heading: { levels: [2, 3] },
          link: false,
          codeBlock: false,
          horizontalRule: false,
        });

    return [
      starterKit,
      Link.configure({
        openOnClick: false,
        autolink: false,
        protocols: [...RICH_TEXT_ALLOWED_URL_SCHEMES],
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ];
  }, [isInline, placeholder]);

  const editor = useEditor(
    {
      extensions,
      content: toEditorHtml(value),
      editable: !disabled,
      autofocus: autoFocus ? 'end' : false,
      immediatelyRender: false,
      shouldRerenderOnTransaction: true,
      editorProps: {
        transformPastedHTML: cleanPastedHtml,
        attributes: {
          class: cn(
            'rich-text-editor__content focus:outline-none p-3',
            isInline ? 'min-h-[72px]' : 'min-h-[150px]',
          ),
          role: 'textbox',
          'aria-multiline': 'true',
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
          ...(id ? { id } : {}),
          ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
          ...(ariaInvalid !== undefined ? { 'aria-invalid': String(ariaInvalid) } : {}),
        },
      },
      onUpdate: ({ editor: updatedEditor }) => {
        const html = updatedEditor.getHTML();
        onChange(isEditorEmptyHtml(html) ? '' : html);
      },
    },
    [extensions],
  );

  // `editorProps` are captured when the editor is created, so validation state arriving later
  // (`aria-invalid` flipping on a failed submit) has to be pushed onto the DOM node.
  useEffect(() => {
    const element = editor?.view?.dom;
    if (!element) return;

    if (ariaDescribedBy) element.setAttribute('aria-describedby', ariaDescribedBy);
    else element.removeAttribute('aria-describedby');

    if (ariaInvalid !== undefined) element.setAttribute('aria-invalid', String(ariaInvalid));
    else element.removeAttribute('aria-invalid');
  }, [editor, ariaDescribedBy, ariaInvalid]);

  // Apply externally driven value changes (form.reset(), AI-populated fields) without
  // stealing the caret from someone who is actively typing.
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    const incoming = toEditorHtml(value);
    const current = editor.getHTML();
    if (incoming === current) return;
    if (isEditorEmptyHtml(incoming) && isEditorEmptyHtml(current)) return;

    editor.commands.setContent(incoming, { emitUpdate: false });
  }, [value, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isEditable === !disabled) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  const handleSetLink = useCallback((activeEditor: Editor) => {
    const previousUrl = (activeEditor.getAttributes('link').href as string | undefined) ?? '';
    const input = window.prompt('URL', previousUrl);

    if (input === null) return;

    if (input.trim() === '') {
      activeEditor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    const href = normalizeRichTextLinkHref(input);
    if (!href) {
      toast.error(
        `Links must start with ${RICH_TEXT_ALLOWED_URL_SCHEMES.join(', ')} — that address was not added.`,
      );
      return;
    }

    activeEditor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }, []);

  if (!editor) return null;

  // Must match the server's measurement (`richTextToPlainText`), which prefixes each list
  // item with "• " — `editor.getText()` does not, and would under-count bulleted content.
  const plainTextLength = richTextToPlainText(editor.getHTML()).length;
  const isOverLimit = maxLength !== undefined && plainTextLength > maxLength;

  return (
    <div className={cn('rich-text-editor', className)}>
      <div className="border rounded-md overflow-hidden bg-background">
        <div
          role="toolbar"
          aria-label="Text formatting"
          className="flex flex-wrap items-center gap-1 border-b bg-muted/50 p-1"
        >
          <ToolbarButton
            label="Bold"
            isActive={editor.isActive('bold')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarButton
            label="Italic"
            isActive={editor.isActive('italic')}
            disabled={disabled}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>

          {!isInline && (
            <>
              <ToolbarButton
                label="Heading 2"
                isActive={editor.isActive('heading', { level: 2 })}
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label="Heading 3"
                isActive={editor.isActive('heading', { level: 3 })}
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                <Heading3 className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label="Bullet list"
                isActive={editor.isActive('bulletList')}
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label="Numbered list"
                isActive={editor.isActive('orderedList')}
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-4 w-4" />
              </ToolbarButton>

              <ToolbarButton
                label="Quote"
                isActive={editor.isActive('blockquote')}
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-4 w-4" />
              </ToolbarButton>
            </>
          )}

          <ToolbarButton
            label="Link"
            isActive={editor.isActive('link')}
            disabled={disabled}
            onClick={() => handleSetLink(editor)}
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>

          {!isInline && (
            <ToolbarButton
              label="Clear formatting"
              isActive={false}
              disabled={disabled}
              onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            >
              <RemoveFormatting className="h-4 w-4" />
            </ToolbarButton>
          )}
        </div>

        <EditorContent editor={editor} />
      </div>

      {maxLength !== undefined && (
        <p
          className={cn(
            'mt-1 text-right text-xs',
            isOverLimit ? 'text-destructive' : 'text-muted-foreground',
          )}
          aria-live="polite"
        >
          {plainTextLength} / {maxLength}
        </p>
      )}
    </div>
  );
}
