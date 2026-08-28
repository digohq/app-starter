import { z } from 'zod';
import { RICH_TEXT_HTML_MAX, isRichTextEmpty, richTextToPlainText } from '@app-starter/shared';

/**
 * A rich-text (sanitized HTML) form field.
 *
 * The user-facing limit is measured on the plain-text projection so markup never counts
 * against it, and an "empty" editor value (`''`, `<p></p>`, `<p><br></p>`) is treated as no
 * value at all. `RICH_TEXT_HTML_MAX` caps the stored markup itself.
 */
export const richTextField = (textMax: number, label: string) =>
  z
    .string()
    .max(RICH_TEXT_HTML_MAX, `${label} formatting is too long`)
    .refine((value) => isRichTextEmpty(value) || richTextToPlainText(value).length <= textMax, {
      message: `${label} must be less than ${textMax} characters`,
    })
    .optional()
    .or(z.literal(''));
