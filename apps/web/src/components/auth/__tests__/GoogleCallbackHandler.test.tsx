import { render, screen, waitFor } from '@testing-library/react';
import { GoogleCallbackHandler } from '../GoogleCallbackHandler';
import { authStorage } from '@/lib/auth-storage';
import { useRouter, useSearchParams } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/auth-storage', () => ({
  authStorage: {
    setTokens: jest.fn(),
    setUser: jest.fn(),
  },
}));

jest.mock('@/lib/auth-api', () => ({
  authApi: {
    getMe: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
  },
}));

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Loading...</div>,
}));

// Mock Suspense to render children immediately
jest.mock('react', () => {
  const original = jest.requireActual('react');
  return {
    ...original,
    Suspense: ({ children }: { children: React.ReactNode }) => children,
  };
});

describe('GoogleCallbackHandler', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it('handles successful callback and fetches user', async () => {
    const mockGet = jest.fn((key: string) => {
      if (key === 'accessToken') return 'access-token';
      if (key === 'refreshToken') return 'refresh-token';
      return null;
    });
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });

    // Mock user response
    (require('@/lib/auth-api').authApi.getMe as jest.Mock).mockResolvedValue({
      id: '123',
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'g-123',
    });

    render(<GoogleCallbackHandler />);

    await waitFor(() => {
      expect(authStorage.setTokens).toHaveBeenCalledWith('access-token', 'refresh-token');
      expect(authStorage.setUser).toHaveBeenCalledWith({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        googleId: 'g-123',
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles invitation state redirect', async () => {
    const mockGet = jest.fn((key: string) => {
      if (key === 'accessToken') return 'access-token';
      if (key === 'refreshToken') return 'refresh-token';
      if (key === 'state') return 'invitation:TOKEN123';
      return null;
    });
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });

    (require('@/lib/auth-api').authApi.getMe as jest.Mock).mockResolvedValue({
      id: '123',
      email: 'test@example.com',
    });

    render(<GoogleCallbackHandler />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/invites/accept?token=TOKEN123');
    });
  });

  it('displays error if parsing fails', async () => {
    const mockGet = jest.fn((key: string) => {
      if (key === 'error') return 'Access denied';
      return null;
    });
    (useSearchParams as jest.Mock).mockReturnValue({ get: mockGet });

    render(<GoogleCallbackHandler />);

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
  });
});
