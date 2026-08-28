import { normalizeRichTextInput, sanitizeRichText } from './rich-text.util';

describe('rich-text.util', () => {
  describe('sanitizeRichText', () => {
    it('keeps allowed formatting tags in the full variant', () => {
      // Arrange
      const input =
        '<h2>What You Will Learn</h2>' +
        '<p><strong>Bold</strong> and <em>italic</em> and <u>underlined</u>.</p>' +
        '<ul><li>First</li><li>Second</li></ul>' +
        '<ol><li>Step one</li></ol>' +
        '<blockquote>Quoted</blockquote>' +
        '<p><code>inline code</code></p>' +
        '<hr />';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).toBe(
        '<h2>What You Will Learn</h2>' +
          '<p><strong>Bold</strong> and <em>italic</em> and <u>underlined</u>.</p>' +
          '<ul><li>First</li><li>Second</li></ul>' +
          '<ol><li>Step one</li></ol>' +
          '<blockquote>Quoted</blockquote>' +
          '<p><code>inline code</code></p>' +
          '<hr />',
      );
    });

    it('unwraps list and heading tags in the inline variant', () => {
      // Arrange
      const input =
        '<h2>Agenda</h2><ul><li>First</li><li>Second</li></ul><blockquote>Quote</blockquote>';

      // Act
      const actual = sanitizeRichText(input, 'inline');

      // Assert
      expect(actual).toBe('<p>Agenda</p><p>First</p><p>Second</p><p>Quote</p>');
      expect(actual).not.toContain('<ul>');
      expect(actual).not.toContain('<h2>');
    });

    it('keeps emphasis and links in the inline variant', () => {
      // Arrange
      const input =
        '<p>Meet <strong>us</strong> at <a href="https://example.app">App Starter</a>.</p>';

      // Act
      const actual = sanitizeRichText(input, 'inline');

      // Assert
      expect(actual).toBe(
        '<p>Meet <strong>us</strong> at ' +
          '<a href="https://example.app" target="_blank" rel="noopener noreferrer nofollow">App Starter</a>.</p>',
      );
    });

    it('strips script tags and their contents', () => {
      // Arrange
      const input = '<p>Safe</p><script>alert("xss")</script>';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).toBe('<p>Safe</p>');
      expect(actual).not.toContain('alert');
    });

    it('strips style, class and on* attributes', () => {
      // Arrange
      const input =
        '<p style="color:red" class="danger" id="intro" onclick="steal()">Text</p>' +
        '<img src="x" onerror="steal()" />' +
        '<style>p { color: red }</style>';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).toBe('<p>Text</p>');
      expect(actual).not.toContain('style=');
      expect(actual).not.toContain('class=');
      expect(actual).not.toContain('onclick');
      expect(actual).not.toContain('onerror');
    });

    it('unwraps anchors with a javascript: href', () => {
      // Arrange
      const input = '<p>Click <a href="javascript:alert(1)">here</a> now</p>';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).toBe('<p>Click here now</p>');
      expect(actual).not.toContain('javascript');
      expect(actual).not.toContain('<a');
    });

    it('unwraps anchors with a data: href or no scheme at all', () => {
      // Arrange
      const dataHref = '<p><a href="data:text/html,<b>x</b>">data</a></p>';
      const relativeHref = '<p><a href="/internal">relative</a></p>';

      // Act
      const actualData = sanitizeRichText(dataHref, 'full');
      const actualRelative = sanitizeRichText(relativeHref, 'full');

      // Assert
      expect(actualData).toBe('<p>data</p>');
      expect(actualRelative).toBe('<p>relative</p>');
    });

    it('adds rel=noopener noreferrer nofollow and target=_blank to anchors', () => {
      // Arrange
      const input =
        '<p><a href="https://example.com" target="_self" rel="me">Site</a> ' +
        '<a href="mailto:hi@example.com">Mail</a></p>';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).toBe(
        '<p><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">Site</a> ' +
          '<a href="mailto:hi@example.com" target="_blank" rel="noopener noreferrer nofollow">Mail</a></p>',
      );
    });

    it('unwraps iframe and table markup to their text content', () => {
      // Arrange
      const input =
        '<iframe src="https://evil.test">frame</iframe><table><tr><td>Cell</td></tr></table>';

      // Act
      const actual = sanitizeRichText(input, 'full');

      // Assert
      expect(actual).not.toContain('<iframe');
      expect(actual).not.toContain('<table');
      expect(actual).toContain('Cell');
    });

    it('returns null for whitespace-only and empty-paragraph input', () => {
      // Arrange
      const inputs = [null, undefined, '', '   ', '<p></p>', '<p><br></p>', '<p>  </p>'];

      // Act
      const actual = inputs.map((input) => sanitizeRichText(input, 'full'));

      // Assert
      expect(actual).toEqual([null, null, null, null, null, null, null]);
    });
  });

  describe('normalizeRichTextInput', () => {
    it('wraps plain text in paragraphs', () => {
      // Arrange
      const input = 'First paragraph.\n\nSecond paragraph.\nSame paragraph, new line.';

      // Act
      const actual = normalizeRichTextInput(input, 'full');

      // Assert
      expect(actual).toBe(
        '<p>First paragraph.</p><p>Second paragraph.<br />Same paragraph, new line.</p>',
      );
    });

    it('escapes markup that arrives as plain text', () => {
      // Arrange
      const input = 'Tom &amp; Jerry <not-a-tag> stay';

      // Act
      const actual = normalizeRichTextInput(input, 'inline');

      // Assert
      expect(actual).toBe('<p>Tom &amp; Jerry &lt;not-a-tag&gt; stay</p>');
    });

    it('leaves already-sanitized HTML unchanged (idempotent)', () => {
      // Arrange
      const input =
        '<p>Join <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">us</a></p>' +
        '<ul><li>One</li></ul>';

      // Act
      const once = normalizeRichTextInput(input, 'full');
      const twice = normalizeRichTextInput(once, 'full');

      // Assert
      expect(once).toBe(input);
      expect(twice).toBe(once);
    });

    it('returns null for empty input', () => {
      // Arrange
      const inputs = [null, undefined, '', '   '];

      // Act
      const actual = inputs.map((input) => normalizeRichTextInput(input, 'inline'));

      // Assert
      expect(actual).toEqual([null, null, null, null]);
    });
  });
});
