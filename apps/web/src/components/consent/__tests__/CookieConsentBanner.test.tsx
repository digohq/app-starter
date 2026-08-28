import { render, screen, fireEvent } from '@testing-library/react';
import { CookieConsentBanner } from '../CookieConsentBanner';
import * as consentLib from '@/lib/consent';

// Mock consent lib
jest.mock('@/lib/consent', () => ({
  hasUserMadeChoice: jest.fn(),
  setConsentPreferences: jest.fn(),
  getConsentPreferences: jest.fn(() => ({ essential: true, analytics: false, marketing: false })),
}));

// Mock the preferences modal to avoid complex dialog rendering in simple unit test
jest.mock('../CookiePreferencesModal', () => ({
  CookiePreferencesModal: ({ isOpen, onClose }: any) =>
    isOpen ? (
      <div data-testid="preferences-modal">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show banner if user has not made a choice', () => {
    (consentLib.hasUserMadeChoice as jest.Mock).mockReturnValue(false);

    render(<CookieConsentBanner />);

    expect(screen.getByText(/We use cookies to improve your experience/i)).toBeInTheDocument();
  });

  it('should not show banner if user has already made a choice', () => {
    (consentLib.hasUserMadeChoice as jest.Mock).mockReturnValue(true);

    render(<CookieConsentBanner />);

    expect(
      screen.queryByText(/We use cookies to improve your experience/i),
    ).not.toBeInTheDocument();
  });

  it('should call setConsentPreferences with all accepted when clicking Accept All', () => {
    (consentLib.hasUserMadeChoice as jest.Mock).mockReturnValue(false);

    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: /Accept All/i }));

    expect(consentLib.setConsentPreferences).toHaveBeenCalledWith({
      essential: true,
      analytics: true,
      marketing: true,
    });
    expect(
      screen.queryByText(/We use cookies to improve your experience/i),
    ).not.toBeInTheDocument();
  });

  it('should call setConsentPreferences with minimal when clicking Reject All', () => {
    (consentLib.hasUserMadeChoice as jest.Mock).mockReturnValue(false);

    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: /Reject All/i }));

    expect(consentLib.setConsentPreferences).toHaveBeenCalledWith({
      essential: true,
      analytics: false,
      marketing: false,
    });
    expect(
      screen.queryByText(/We use cookies to improve your experience/i),
    ).not.toBeInTheDocument();
  });

  it('should open preferences modal when clicking Customize', () => {
    (consentLib.hasUserMadeChoice as jest.Mock).mockReturnValue(false);

    render(<CookieConsentBanner />);

    fireEvent.click(screen.getByRole('button', { name: /Customize/i }));

    expect(screen.getByTestId('preferences-modal')).toBeInTheDocument();
  });
});
