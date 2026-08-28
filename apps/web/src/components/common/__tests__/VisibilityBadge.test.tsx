import { render, screen } from '@testing-library/react';
import { VisibilityBadge } from '../VisibilityBadge';

describe('VisibilityBadge', () => {
  it('renders Public label when visibility is PUBLIC', () => {
    render(<VisibilityBadge visibility="PUBLIC" />);
    expect(screen.getByText('Public')).toBeInTheDocument();
  });

  it('renders Unlisted label when visibility is UNLISTED', () => {
    render(<VisibilityBadge visibility="UNLISTED" />);
    expect(screen.getByText('Unlisted')).toBeInTheDocument();
  });

  it('renders Private label when visibility is PRIVATE', () => {
    render(<VisibilityBadge visibility="PRIVATE" />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('defaults to Private when visibility is undefined', () => {
    render(<VisibilityBadge />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('defaults to Private when visibility is null', () => {
    render(<VisibilityBadge visibility={null} />);
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<VisibilityBadge visibility="PUBLIC" className="custom-class" />);
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
