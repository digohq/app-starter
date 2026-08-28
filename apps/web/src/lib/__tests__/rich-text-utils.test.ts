import {
  EVENT_DESCRIPTION_TEXT_MAX,
  RICH_TEXT_ALLOWED_URL_SCHEMES,
  RICH_TEXT_FULL_TAGS,
  RICH_TEXT_HTML_MAX,
  RICH_TEXT_INLINE_TAGS,
  SESSION_DESCRIPTION_TEXT_MAX,
  isRichTextEmpty,
  isRichTextHtml,
  plainTextToRichTextHtml,
  richTextToPlainText,
} from '@app-starter/shared';

describe('rich text constants', () => {
  it('exposes the full and inline tag allowlists with the inline set a subset of full', () => {
    // Arrange
    const fullTags = new Set<string>(RICH_TEXT_FULL_TAGS);

    // Act
    const inlineOutsideFull = RICH_TEXT_INLINE_TAGS.filter((tag) => !fullTags.has(tag));

    // Assert
    expect(inlineOutsideFull).toEqual([]);
    expect(fullTags.has('ul')).toBe(true);
    expect(new Set<string>(RICH_TEXT_INLINE_TAGS).has('ul')).toBe(false);
    expect(RICH_TEXT_ALLOWED_URL_SCHEMES).toEqual(['http', 'https', 'mailto']);
    expect(EVENT_DESCRIPTION_TEXT_MAX).toBe(5000);
    expect(SESSION_DESCRIPTION_TEXT_MAX).toBe(500);
    expect(RICH_TEXT_HTML_MAX).toBe(40000);
  });
});

describe('isRichTextHtml', () => {
  it('isRichTextHtml returns false for legacy escaped plain text', () => {
    // Arrange
    const inputLegacy = 'Bring your laptop &amp; a charger.\nWe start at 9am &lt;sharp&gt;';

    // Act
    const actual = isRichTextHtml(inputLegacy);

    // Assert
    expect(actual).toBe(false);
    expect(isRichTextHtml(null)).toBe(false);
    expect(isRichTextHtml(undefined)).toBe(false);
    expect(isRichTextHtml('')).toBe(false);
  });

  it('isRichTextHtml returns true for editor output containing <p>', () => {
    // Arrange
    const inputHtml = '<p>What you will learn</p>';

    // Act & Assert
    expect(isRichTextHtml(inputHtml)).toBe(true);
    expect(isRichTextHtml('Line one<br>Line two')).toBe(true);
    expect(isRichTextHtml('<ul><li>One</li></ul>')).toBe(true);
    expect(isRichTextHtml('<strong>Bold</strong>')).toBe(true);
  });
});

describe('richTextToPlainText', () => {
  it('richTextToPlainText converts list items to bullet lines', () => {
    // Arrange
    const inputHtml = '<p>What you will learn</p><ul><li>Scoping</li><li>Shipping</li></ul>';

    // Act
    const actual = richTextToPlainText(inputHtml);

    // Assert
    expect(actual).toBe('What you will learn\n\n• Scoping\n• Shipping');
  });

  it('richTextToPlainText decodes entities and collapses blank lines', () => {
    // Arrange
    const inputHtml = '<p>Tom &amp; Jerry</p><p><br></p><p></p><p>Second &quot;act&quot;</p>';

    // Act
    const actual = richTextToPlainText(inputHtml);

    // Assert
    expect(actual).toBe('Tom & Jerry\n\nSecond "act"');
  });

  it('richTextToPlainText falls back to entity decoding for legacy plain text', () => {
    // Arrange
    const inputLegacy = '  Tom &amp; Jerry present: &quot;Cheese&quot;  ';

    // Act
    const actual = richTextToPlainText(inputLegacy);

    // Assert
    expect(actual).toBe('Tom & Jerry present: "Cheese"');
    expect(richTextToPlainText(null)).toBe('');
    expect(richTextToPlainText(undefined)).toBe('');
  });

  it('richTextToPlainText drops script contents and emits no markup', () => {
    // Arrange
    const inputHtml = '<p>Hello</p><script>alert("xss")</script><p>World</p>';

    // Act
    const actual = richTextToPlainText(inputHtml);

    // Assert
    expect(actual).toBe('Hello\n\nWorld');
    expect(actual).not.toMatch(/[<>]/);
  });
});

describe('plainTextToRichTextHtml', () => {
  it('plainTextToRichTextHtml splits blank lines into paragraphs and single newlines into <br>', () => {
    // Arrange
    const inputText = 'First line\nSecond line\n\nNew paragraph';

    // Act
    const actual = plainTextToRichTextHtml(inputText);

    // Assert
    expect(actual).toBe('<p>First line<br>Second line</p><p>New paragraph</p>');
  });

  it('plainTextToRichTextHtml escapes angle brackets in the source text', () => {
    // Arrange
    const inputText = 'Use <script>alert(1)</script> & "quotes"';

    // Act
    const actual = plainTextToRichTextHtml(inputText);

    // Assert
    expect(actual).toBe(
      '<p>Use &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>',
    );
  });

  it('plainTextToRichTextHtml returns null for empty and whitespace-only input', () => {
    // Act & Assert
    expect(plainTextToRichTextHtml(null)).toBeNull();
    expect(plainTextToRichTextHtml(undefined)).toBeNull();
    expect(plainTextToRichTextHtml('')).toBeNull();
    expect(plainTextToRichTextHtml('   \n\n  ')).toBeNull();
  });
});

describe('isRichTextEmpty', () => {
  it("isRichTextEmpty is true for null, '', '<p></p>' and '<p><br></p>'", () => {
    // Act & Assert
    expect(isRichTextEmpty(null)).toBe(true);
    expect(isRichTextEmpty(undefined)).toBe(true);
    expect(isRichTextEmpty('')).toBe(true);
    expect(isRichTextEmpty('   ')).toBe(true);
    expect(isRichTextEmpty('<p></p>')).toBe(true);
    expect(isRichTextEmpty('<p><br></p>')).toBe(true);
    expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true);
  });

  it('isRichTextEmpty is false when there is visible content', () => {
    // Act & Assert
    expect(isRichTextEmpty('<p>Hello</p>')).toBe(false);
    expect(isRichTextEmpty('Legacy plain text')).toBe(false);
    expect(isRichTextEmpty('<ul><li>One</li></ul>')).toBe(false);
  });
});
