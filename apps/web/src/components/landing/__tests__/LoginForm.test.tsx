import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../LoginForm';
import { authApi } from '@/lib/auth-api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

jest.mock('@/lib/auth-api', () => ({
  authApi: {
    login: jest.fn(),
    requestOtpForLogin: jest.fn(),
    loginWithOtp: jest.fn(),
  },
}));

jest.mock('@/lib/auth-storage', () => ({
  authStorage: {
    getLastEmail: jest.fn(() => ''),
    setLastEmail: jest.fn(),
    setTokens: jest.fn(),
    setUser: jest.fn(),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  redirectAfterAuth: jest.fn(async () => '/dashboard'),
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LoginForm', () => {
  const mockLoginResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authApi.login as jest.Mock).mockResolvedValue(mockLoginResponse);
  });

  it('renders email and password fields', () => {
    render(<LoginForm />);

    // Default is password tab
    expect(screen.getAllByLabelText(/email/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
  });

  it('validates email is required', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordTab = screen.getByRole('tabpanel', { name: /email & password/i });
    const submitButton = within(passwordTab).getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument();
    });
  });

  it('validates password is required', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordTab = screen.getByRole('tabpanel', { name: /email & password/i });
    const emailInput = within(passwordTab).getByLabelText(/email/i);

    await user.type(emailInput, 'test@example.com');
    const submitButton = within(passwordTab).getByRole('button', { name: /log in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordTab = screen.getByRole('tabpanel', { name: /email & password/i });
    const emailInput = within(passwordTab).getByLabelText(/email/i);
    const passwordInput = within(passwordTab).getByLabelText(/^password$/i);
    const submitButton = within(passwordTab).getByRole('button', { name: /log in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });
});
