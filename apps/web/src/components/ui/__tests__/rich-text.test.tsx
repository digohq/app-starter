import { render, screen } from '@testing-library/react';
import { RichText } from '@/components/ui/rich-text';

describe('RichText', () => {
  it('renders list markup as a list', () => {
    const { container } = render(
      <RichText html="<ul><li>First takeaway</li><li>Second takeaway</li></ul>" />,
    );

    const items = container.querySelectorAll('li');
    expect(container.querySelector('ul')).not.toBeNull();
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('First takeaway');
    expect(items[1]).toHaveTextContent('Second takeaway');
  });

  it('renders legacy plain text with newlines as paragraphs', () => {
    const { container } = render(<RichText html={'First line\n\nSecond line'} />);

    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent('First line');
    expect(paragraphs[1]).toHaveTextContent('Second line');
  });

  it('removes a script tag from untrusted stored HTML', () => {
    const { container } = render(
      <RichText html={'<p>Safe copy</p><script>window.stolen = 1;</script>'} />,
    );

    expect(container.querySelector('script')).toBeNull();
    expect(container.innerHTML).not.toContain('window.stolen');
    expect(screen.getByText('Safe copy')).toBeInTheDocument();
  });

  it('renders nothing for empty rich text', () => {
    const { container: nullContainer } = render(<RichText html={null} />);
    const { container: emptyParagraphContainer } = render(<RichText html="<p></p>" />);
    const { container: breakOnlyContainer } = render(<RichText html="<p><br></p>" />);

    expect(nullContainer).toBeEmptyDOMElement();
    expect(emptyParagraphContainer).toBeEmptyDOMElement();
    expect(breakOnlyContainer).toBeEmptyDOMElement();
  });

  it('strips block markup and event handler attributes in the inline variant', () => {
    const { container } = render(
      <RichText
        html={'<h2 onclick="steal()">Heading</h2><ul><li>Point</li></ul>'}
        variant="inline"
      />,
    );

    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.innerHTML).not.toContain('onclick');
    expect(container.querySelector('.rich-text--inline')).not.toBeNull();
    expect(container).toHaveTextContent('Heading');
    expect(container).toHaveTextContent('Point');
  });

  it('rewrites surviving anchors to open safely and drops javascript hrefs', () => {
    const { container } = render(
      <RichText
        html={
          '<p><a href="https://example.app">App Starter</a> <a href="javascript:alert(1)">bad</a></p>'
        }
      />,
    );

    const safeAnchor = container.querySelector('a[href="https://example.app"]');
    expect(safeAnchor).not.toBeNull();
    expect(safeAnchor).toHaveAttribute('target', '_blank');
    expect(safeAnchor).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    expect(container.innerHTML).not.toContain('javascript:');
  });

  it('applies the clamp line count on card surfaces', () => {
    const { container } = render(<RichText html="<p>Summary</p>" variant="inline" clamp={3} />);

    const wrapper = container.querySelector('.rich-text--clamp') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.getPropertyValue('--rich-text-clamp')).toBe('3');
  });
});
