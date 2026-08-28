import { render, screen } from '@testing-library/react';
import { PrivatePageBanner } from '../PrivatePageBanner';

describe('PrivatePageBanner', () => {
  it('renders private variant by default', () => {
    render(<PrivatePageBanner />);
    expect(
      screen.getByText(
        /this page is set to private and is only visible to users that have been added as organizers/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders private variant when variant="private"', () => {
    render(<PrivatePageBanner variant="private" />);
    expect(
      screen.getByText(
        /this page is set to private and is only visible to users that have been added as organizers/i,
      ),
    ).toBeInTheDocument();
  });

  it('renders unlisted variant when variant="unlisted"', () => {
    render(<PrivatePageBanner variant="unlisted" />);
    expect(
      screen.getByText(
        /this event\/session is unlisted and won't appear in search or on public pages/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/only people with the link can view it/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<PrivatePageBanner className="custom-banner" />);
    const banner = container.firstChild as HTMLElement;
    expect(banner).toHaveClass('custom-banner');
  });
});
