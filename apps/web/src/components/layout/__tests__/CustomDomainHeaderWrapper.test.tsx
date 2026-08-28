import { render, screen, act } from '@testing-library/react';
import { CustomDomainHeaderWrapper } from '../CustomDomainHeaderWrapper';
import { usePathname } from 'next/navigation';
import { authStorage, AUTH_CHANGE_EVENT } from '@/lib/auth-storage';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock authStorage
jest.mock('@/lib/auth-storage', () => ({
  authStorage: {
    isAuthenticated: jest.fn(),
  },
  AUTH_CHANGE_EVENT: 'app-starter:auth-change',
}));

// Mock UnifiedHeader to verify it renders
jest.mock('../UnifiedHeader', () => ({
  UnifiedHeader: ({ customLogoUrl }: { customLogoUrl?: string | null }) => (
    <div data-testid="unified-header" data-logo={customLogoUrl || ''}>
      Header
    </div>
  ),
}));

describe('CustomDomainHeaderWrapper', () => {
  const mockUsePathname = usePathname as jest.Mock;
  const mockIsAuthenticated = authStorage.isAuthenticated as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUsePathname.mockReturnValue('/');
    mockIsAuthenticated.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('when NOT on a white-label calendar (standard pages)', () => {
    it('always shows the header regardless of auth state', () => {
      mockUsePathname.mockReturnValue('/dashboard');

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={false} />);

      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('shows the header even when user is not logged in', () => {
      mockUsePathname.mockReturnValue('/');
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={false} />);

      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('passes through customLogoUrl and logoHeight props', () => {
      mockUsePathname.mockReturnValue('/');
      const customLogoUrl = 'https://example.com/logo.png';

      render(
        <CustomDomainHeaderWrapper
          isWhiteLabelCalendar={false}
          customLogoUrl={customLogoUrl}
          logoHeight={48}
        />,
      );

      const header = screen.getByTestId('unified-header');
      expect(header).toBeInTheDocument();
      expect(header.getAttribute('data-logo')).toBe(customLogoUrl);
    });
  });

  describe('when on a white-label calendar', () => {
    it('hides the header on the calendar root page even when logged in', () => {
      mockUsePathname.mockReturnValue('/');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });

    it('hides the header on the /calendar page even when logged in', () => {
      mockUsePathname.mockReturnValue('/calendar');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });

    it('shows the header on event detail pages when user is already logged in', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Auth is already true, so no settle delay needed
      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('shows the header on session detail pages when user is already logged in', () => {
      mockUsePathname.mockReturnValue('/session/my-session-slug');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('shows the header on calendar detail pages when user is already logged in', () => {
      mockUsePathname.mockReturnValue('/calendar/my-calendar-slug');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('hides the header on event detail pages when user is NOT logged in (after settle)', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Wait for settle delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });
  });

  describe('race condition: CookieSync async auth restoration', () => {
    it('shows header when CookieSync fires AUTH_CHANGE_EVENT after initial mount', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      // Initially not authenticated
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Header not shown yet (auth still settling)
      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();

      // CookieSync restores session and fires event
      mockIsAuthenticated.mockReturnValue(true);
      act(() => {
        window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
      });

      // Header should now appear
      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('does not flash header while auth is still settling (null state)', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Before settle delay: header should NOT be shown (auth state is null)
      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();

      // Advance partway through settle delay
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Still not shown
      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });

    it('settles to not-authenticated after delay when CookieSync does not restore', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Wait for full settle delay
      act(() => {
        jest.advanceTimersByTime(200);
      });

      // Auth settled to false, header stays hidden
      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });

    it('clears settle timer when AUTH_CHANGE_EVENT fires before timeout', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(false);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // CookieSync fires before settle timer
      mockIsAuthenticated.mockReturnValue(true);
      act(() => {
        jest.advanceTimersByTime(50); // Before 150ms settle
        window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
      });

      expect(screen.getByTestId('unified-header')).toBeInTheDocument();
    });

    it('handles logout after auth was established', () => {
      mockUsePathname.mockReturnValue('/events/my-event-slug');
      mockIsAuthenticated.mockReturnValue(true);

      render(<CustomDomainHeaderWrapper isWhiteLabelCalendar={true} />);

      // Header is shown (user is authenticated)
      expect(screen.getByTestId('unified-header')).toBeInTheDocument();

      // User logs out
      mockIsAuthenticated.mockReturnValue(false);
      act(() => {
        window.dispatchEvent(new CustomEvent(AUTH_CHANGE_EVENT));
      });

      // Header should disappear
      expect(screen.queryByTestId('unified-header')).not.toBeInTheDocument();
    });
  });
});
