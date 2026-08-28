import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FULL_BIO_MAX_LENGTH } from '@app-starter/shared';
import { IsRichTextWithinLength } from './rich-text-length.validator';

class TestBioDto {
  @IsRichTextWithinLength(FULL_BIO_MAX_LENGTH)
  bio?: string;
}

describe('IsRichTextWithinLength', () => {
  it('accepts a 5000-character bio wrapped in markup', async () => {
    // The raw HTML string is longer than the limit; only the plain text is measured.
    const html = `<p><strong>${'a'.repeat(FULL_BIO_MAX_LENGTH)}</strong></p>`;
    expect(html.length).toBeGreaterThan(FULL_BIO_MAX_LENGTH);

    const dto = plainToInstance(TestBioDto, { bio: html });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('rejects a bio whose plain text exceeds the limit', async () => {
    const html = `<p>${'a'.repeat(FULL_BIO_MAX_LENGTH + 1)}</p>`;

    const dto = plainToInstance(TestBioDto, { bio: html });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('bio');
  });
});
