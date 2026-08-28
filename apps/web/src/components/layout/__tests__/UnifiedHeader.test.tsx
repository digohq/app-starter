import { render, screen } from '@testing-library/react';
import { UnifiedHeader } from '../UnifiedHeader';
import { usePathname } from 'next/navigation';
import { LOGO_PATH } from '@/lib/brand';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock the navigation barrel to track logoSrc
jest.mock('@/components/ui/navigation', () => {
  const actual = jest.requireActual('@/components/ui/navigation');
  return {
    ...actual,
    HeaderBrand: jest.fn(({ logoSrc, brandName }) => (
      <div data-testid="header-brand" data-logo={logoSrc} data-brand={brandName}>
        {brandName}
      </div>
    )),
  };
});

// Mock other components used in UnifiedHeader
jest.mock('@/components/public/UserProfileMenu', () => ({
  UserProfileMenu: () => <div>UserProfileMenu</div>,
}));
jest.mock('@/components/ThemeToggle', () => ({
  ThemeToggle: () => <div>ThemeToggle</div>,
}));
jest.mock('@/components/notifications/NotificationCenter', () => ({
  NotificationCenter: () => <div>NotificationCenter</div>,
}));

describe('UnifiedHeader', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/');
  });

  it('uses default logo when customLogoUrl is not provided', () => {
    render(<UnifiedHeader />);
    const brand = screen.getByTestId('header-brand');
    expect(brand.getAttribute('data-logo')).toBe(LOGO_PATH);
    expect(brand.getAttribute('data-brand')).toBe('app-starter');
  });

  it('uses custom logo when customLogoUrl is provided', () => {
    const customLogoUrl = 'https://example.com/custom-logo.png';
    render(<UnifiedHeader customLogoUrl={customLogoUrl} />);
    const brand = screen.getByTestId('header-brand');
    expect(brand.getAttribute('data-logo')).toBe(customLogoUrl);
    expect(brand.getAttribute('data-brand')).toBe('');
  });

  it('uses default logo when customLogoUrl is null', () => {
    render(<UnifiedHeader customLogoUrl={null} />);
    const brand = screen.getByTestId('header-brand');
    expect(brand.getAttribute('data-logo')).toBe(LOGO_PATH);
    expect(brand.getAttribute('data-brand')).toBe('app-starter');
  });
});
