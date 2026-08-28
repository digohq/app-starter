import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { richTextToPlainText } from '@app-starter/shared';
import {
  RichTextEditor,
  cleanPastedHtml,
  normalizeRichTextLinkHref,
} from '@/components/ui/rich-text-editor';

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

const mockToastError = toast.error as jest.Mock;

const getEditorContent = (container: HTMLElement): HTMLElement => {
  const element = container.querySelector('.ProseMirror');
  if (!element) throw new Error('editor content element not found');
  return element as HTMLElement;
};

/** Wait for the SSR-safe editor (immediatelyRender: false) to mount. */
const renderEditor = async (ui: React.ReactElement) => {
  const utils = render(ui);
  await waitFor(() => expect(utils.container.querySelector('.ProseMirror')).not.toBeNull());
  return utils;
};

/**
 * Representative Google Docs clipboard HTML: every copy is wrapped in
 * `<b style="font-weight:normal" id="docs-internal-guid-…">`, and emphasis rides on
 * `<span style="font-weight:700|font-style:italic">` rather than on `<strong>`/`<em>`.
 */
const GOOGLE_DOCS_CLIPBOARD_HTML = [
  '<meta charset="utf-8">',
  '<b style="font-weight:normal;" id="docs-internal-guid-1f0a-7c3b-0000">',
  '<p dir="ltr" style="line-height:1.38;margin-top:0pt;margin-bottom:0pt;">',
  '<span style="font-size:11pt;font-family:Arial;color:#000000;font-weight:700;font-style:normal;',
  'text-decoration:none;white-space:pre-wrap;">What You&#39;ll Learn</span>',
  '</p>',
  '<ul style="margin-top:0;margin-bottom:0;">',
  '<li dir="ltr" aria-level="1" style="list-style-type:disc;font-size:11pt;font-weight:400;">',
  '<p dir="ltr" role="presentation" style="line-height:1.38;">',
  '<span style="font-size:11pt;font-family:Arial;font-weight:400;font-style:italic;">Design tokens</span>',
  '</p></li>',
  '<li dir="ltr" aria-level="1" style="list-style-type:disc;font-size:11pt;font-weight:400;">',
  '<p dir="ltr" role="presentation" style="line-height:1.38;">',
  '<span style="font-size:11pt;font-family:Arial;font-weight:400;font-style:normal;">Component APIs</span>',
  '</p></li>',
  '</ul>',
  '</b>',
].join('');

/** Dispatch a clipboard paste of `html` at the editor, the way ProseMirror expects to receive it. */
const pasteHtmlIntoEditor = async (container: HTMLElement, html: string) => {
  const content = getEditorContent(container);
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      types: ['text/html'],
      files: [],
      getData: (type: string) => (type === 'text/html' ? html : ''),
    },
  });

  await act(async () => {
    content.dispatchEvent(event);
  });
};

describe('RichTextEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the full toolbar with list and heading controls', async () => {
    await renderEditor(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);

    for (const label of [
      'Bold',
      'Italic',
      'Heading 2',
      'Heading 3',
      'Bullet list',
      'Numbered list',
      'Quote',
      'Link',
      'Clear formatting',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
  });

  it('renders only inline controls in the inline variant', async () => {
    await renderEditor(
      <RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} variant="inline" />,
    );

    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();

    for (const label of ['Heading 2', 'Heading 3', 'Bullet list', 'Numbered list', 'Quote']) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
  });

  it('toolbar buttons have type=button and do not submit the surrounding form', async () => {
    const user = userEvent.setup();
    const handleSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());

    await renderEditor(
      <form onSubmit={handleSubmit}>
        <RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />
      </form>,
    );

    const boldButton = screen.getByRole('button', { name: 'Bold' });
    expect(boldButton).toHaveAttribute('type', 'button');
    expect(boldButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(boldButton);

    expect(handleSubmit).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('calls onChange with HTML when content changes', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    await renderEditor(<RichTextEditor value="<p>Hello</p>" onChange={handleChange} />);

    await user.click(screen.getByRole('button', { name: 'Bullet list' }));

    await waitFor(() => expect(handleChange).toHaveBeenCalled());
    expect(handleChange.mock.calls.at(-1)?.[0]).toContain('<ul>');
    expect(handleChange.mock.calls.at(-1)?.[0]).toContain('Hello');
  });

  it('applies an externally changed value when the editor is not focused', async () => {
    const { container, rerender } = await renderEditor(
      <RichTextEditor value="<p>Original</p>" onChange={jest.fn()} />,
    );

    expect(getEditorContent(container)).toHaveTextContent('Original');

    rerender(<RichTextEditor value="<p>Reset by the form</p>" onChange={jest.fn()} />);

    await waitFor(() => expect(getEditorContent(container)).toHaveTextContent('Reset by the form'));
  });

  it('does not clobber the caret when value updates while focused', async () => {
    const handleChange = jest.fn();
    const { container, rerender } = await renderEditor(
      <RichTextEditor value="<p>Typed by the user</p>" onChange={handleChange} />,
    );

    act(() => {
      getEditorContent(container).focus();
    });
    expect(document.activeElement).toBe(getEditorContent(container));

    act(() => {
      rerender(<RichTextEditor value="<p>Stale server value</p>" onChange={handleChange} />);
    });

    expect(getEditorContent(container)).toHaveTextContent('Typed by the user');
    expect(getEditorContent(container)).not.toHaveTextContent('Stale server value');
  });

  it('keeps paragraph breaks when a legacy plain-text value is loaded', async () => {
    const { container } = await renderEditor(
      <RichTextEditor value={'Line one\n\nLine two'} onChange={jest.fn()} />,
    );

    const paragraphs = getEditorContent(container).querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('Line one');
    expect(paragraphs[1]).toHaveTextContent('Line two');
  });

  it('keeps paragraph breaks when plain text arrives from an external update', async () => {
    const { container, rerender } = await renderEditor(
      <RichTextEditor value="" onChange={jest.fn()} />,
    );

    rerender(<RichTextEditor value={'AI first\n\nAI second'} onChange={jest.fn()} />);

    await waitFor(() => expect(getEditorContent(container).querySelectorAll('p')).toHaveLength(2));
  });

  it('shows the placeholder when empty', async () => {
    const { container } = await renderEditor(
      <RichTextEditor value="" onChange={jest.fn()} placeholder="Describe your event" />,
    );

    await waitFor(() =>
      expect(container.querySelector('[data-placeholder="Describe your event"]')).not.toBeNull(),
    );
    expect(container.querySelector('.is-editor-empty')).not.toBeNull();
  });

  it('shows a character counter against maxLength using plain-text length', async () => {
    await renderEditor(
      <RichTextEditor value="<p><strong>Hello</strong></p>" onChange={jest.fn()} maxLength={100} />,
    );

    expect(screen.getByText('5 / 100')).toBeInTheDocument();
  });

  it('counts list bullets the way the server measures them', async () => {
    // The API measures with richTextToPlainText, which prefixes each <li> with "• ".
    await renderEditor(
      <RichTextEditor
        value="<ul><li>One</li><li>Two</li></ul>"
        onChange={jest.fn()}
        maxLength={100}
      />,
    );

    const expected = richTextToPlainText('<ul><li><p>One</p></li><li><p>Two</p></li></ul>').length;
    expect(screen.getByText(`${expected} / 100`)).toBeInTheDocument();
    // "OneTwo" is 6 — the bullets and separators must be counted too.
    expect(expected).toBeGreaterThan(6);
  });

  it('marks the character counter as destructive past the limit', async () => {
    await renderEditor(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} maxLength={3} />);

    expect(screen.getByText('5 / 3')).toHaveClass('text-destructive');
  });

  it('normalizes a link entered without a scheme to https://', async () => {
    const user = userEvent.setup();
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('example.com');

    expect(normalizeRichTextLinkHref('example.com')).toBe('https://example.com');
    expect(normalizeRichTextLinkHref('  example.app/events  ')).toBe('https://example.app/events');
    expect(normalizeRichTextLinkHref('https://example.com')).toBe('https://example.com');
    expect(normalizeRichTextLinkHref('mailto:hi@example.app')).toBe('mailto:hi@example.app');

    await renderEditor(<RichTextEditor value="<p>Hello</p>" onChange={jest.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Link' }));

    expect(promptSpy).toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();

    promptSpy.mockRestore();
  });

  it('keeps lists and emphasis when content is pasted from Google Docs', async () => {
    const handleChange = jest.fn();
    const { container } = await renderEditor(<RichTextEditor value="" onChange={handleChange} />);

    await pasteHtmlIntoEditor(container, GOOGLE_DOCS_CLIPBOARD_HTML);

    await waitFor(() => expect(handleChange).toHaveBeenCalled());
    const html = handleChange.mock.calls.at(-1)?.[0] as string;

    expect(html).toContain("<strong>What You'll Learn</strong>");
    expect(html).toContain('<ul>');
    expect(html).toContain('<em>Design tokens</em>');
    // The un-emphasised list item stays plain: the Google Docs wrapper must not bold everything.
    expect(html).toMatch(/<li><p>Component APIs<\/p><\/li>/);
    expect(html).not.toContain('<strong>Design tokens</strong>');
  });

  it('carries no inline style or class attributes out of a pasted document', async () => {
    const handleChange = jest.fn();
    const { container } = await renderEditor(<RichTextEditor value="" onChange={handleChange} />);

    await pasteHtmlIntoEditor(container, GOOGLE_DOCS_CLIPBOARD_HTML);

    await waitFor(() => expect(handleChange).toHaveBeenCalled());
    const html = handleChange.mock.calls.at(-1)?.[0] as string;

    expect(html).not.toMatch(/\sstyle=/);
    expect(html).not.toMatch(/\sclass=/);
    expect(html).not.toMatch(/\sid=/);
  });

  it('cleanPastedHtml keeps emphasis styles and drops presentational noise', async () => {
    const cleaned = cleanPastedHtml(GOOGLE_DOCS_CLIPBOARD_HTML);

    expect(cleaned).not.toContain('docs-internal-guid');
    expect(cleaned).not.toMatch(/\sclass=/);
    expect(cleaned).not.toContain('font-family');
    expect(cleaned).not.toContain('color:');
    expect(cleaned).toContain('font-weight:700');
    expect(cleaned).toContain('font-style:italic');
    expect(cleaned).toContain('<ul>');
  });

  it('cleanPastedHtml keeps anchor hrefs and drops event handlers', async () => {
    const cleaned = cleanPastedHtml(
      '<p class="c1"><a href="https://example.app" title="App Starter" onclick="alert(1)" class="c2">App Starter</a></p>' +
        '<script>alert(1)</script>',
    );

    expect(cleaned).toContain('href="https://example.app"');
    expect(cleaned).toContain('title="App Starter"');
    expect(cleaned).not.toContain('onclick');
    expect(cleaned).not.toContain('script');
    expect(cleaned).not.toMatch(/\sclass=/);
  });

  it('rejects a javascript: link', async () => {
    const user = userEvent.setup();
    const promptSpy = jest.spyOn(window, 'prompt').mockReturnValue('javascript:alert(1)');
    const handleChange = jest.fn();

    expect(normalizeRichTextLinkHref('javascript:alert(1)')).toBeNull();
    expect(normalizeRichTextLinkHref('data:text/html;base64,x')).toBeNull();

    const { container } = await renderEditor(
      <RichTextEditor value="<p>Hello</p>" onChange={handleChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Link' }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalled());
    expect(getEditorContent(container).querySelector('a')).toBeNull();

    promptSpy.mockRestore();
  });
});
