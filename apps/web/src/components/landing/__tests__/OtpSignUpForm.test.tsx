import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpSignUpForm } from '../OtpSignUpForm';
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

// Mock authApi including dynamic import
jest.mock('@/lib/auth-api', () => ({
  authApi: {
    requestOtp: jest.fn(),
    signUpWithOtp: jest.fn(),
  },
}));

jest.mock('@/lib/auth-storage', () => ({
  authStorage: {
    setLastEmail: jest.fn(),
    getLastEmail: jest.fn(() => ''),
    setTokens: jest.fn(),
    setUser: jest.fn(),
  },
}));

jest.mock('@/lib/auth-utils', () => ({
  redirectAfterAuth: jest.fn(),
}));

describe('OtpSignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authApi.requestOtp as jest.Mock).mockResolvedValue({ message: 'Code sent' });
  });

  it('renders email form initially', () => {
    render(<OtpSignUpForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument();
  });

  it('validates name is required', async () => {
    const user = userEvent.setup();
    render(<OtpSignUpForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it('transitions to OTP form after email submission', async () => {
    const user = userEvent.setup();
    render(<OtpSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByText(/sent/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify & sign up/i })).toBeInTheDocument();
    });
  });

  it('validates OTP length', async () => {
    const { container } = render(<OtpSignUpForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /send verification code/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verify & sign up/i })).toBeInTheDocument();
    });

    const otpInput = container.querySelector('input[name="otp"]') as HTMLInputElement;
    await user.type(otpInput, '123');
    await user.click(screen.getByRole('button', { name: /verify & sign up/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/6 digits/i).length).toBeGreaterThan(0);
    });
  });
});
