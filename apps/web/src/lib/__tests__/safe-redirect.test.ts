import { isSafeRelativePath } from '@/lib/safe-redirect';

describe('isSafeRelativePath', () => {
  it('accepts a single-slash relative path', () => {
    expect(isSafeRelativePath('/speaker-questionnaire/sess-1/spk-1')).toBe(true);
    expect(isSafeRelativePath('/profile/edit?highlight=bio')).toBe(true);
    expect(isSafeRelativePath('/')).toBe(true);
  });

  it('rejects a protocol-relative path', () => {
    expect(isSafeRelativePath('//evil.example.com')).toBe(false);
    expect(isSafeRelativePath('//evil.example.com/profile/edit')).toBe(false);
  });

  it('rejects paths carrying tab/CR/LF, which the URL parser strips', () => {
    // The WHATWG URL parser removes U+0009/U+000A/U+000D before parsing, so
    // these would otherwise slip past the `//` check and navigate off-origin.
    expect(isSafeRelativePath('/\t/evil.example.com')).toBe(false);
    expect(isSafeRelativePath('/\n/evil.example.com')).toBe(false);
    expect(isSafeRelativePath('/\r/evil.example.com')).toBe(false);
    expect(isSafeRelativePath('/\u0000/evil.example.com')).toBe(false);
  });

  it('rejects an absolute URL and a backslash path', () => {
    expect(isSafeRelativePath('https://evil.example.com')).toBe(false);
    expect(isSafeRelativePath('javascript:alert(1)')).toBe(false);
    expect(isSafeRelativePath('/\\evil.example.com')).toBe(false);
    expect(isSafeRelativePath('\\\\evil.example.com')).toBe(false);
    expect(isSafeRelativePath('profile/edit')).toBe(false);
    expect(isSafeRelativePath('')).toBe(false);
    expect(isSafeRelativePath(null)).toBe(false);
  });
});
