import { ValidationArguments, ValidationOptions, registerDecorator } from 'class-validator';
import { richTextToPlainText } from '@app-starter/shared';

/**
 * Validate a rich-text field against a **plain-text** character limit.
 *
 * Stored descriptions are sanitized HTML, so a raw `@MaxLength` would charge the organizer for
 * markup they never typed. This decorator measures `richTextToPlainText(value).length` instead,
 * which keeps every user-facing limit identical to what it was when the fields held plain text.
 * Pair it with a `@MaxLength(RICH_TEXT_HTML_MAX)` on the raw string so markup overhead still has
 * a hard ceiling.
 *
 * Empty values (`undefined`, `null`, `''`) pass — optionality is expressed with `@IsOptional`.
 */
export function IsRichTextWithinLength(
  maxTextLength: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isRichTextWithinLength',
      target: object.constructor,
      propertyName,
      constraints: [maxTextLength],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return false;

          const [maxLength] = args.constraints as [number];
          return richTextToPlainText(value).length <= maxLength;
        },
        defaultMessage(args: ValidationArguments): string {
          const [maxLength] = args.constraints as [number];
          return `${args.property} must not exceed ${maxLength} characters of text (formatting is not counted)`;
        },
      },
    });
  };
}
