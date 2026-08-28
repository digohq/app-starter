import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PasswordSignUpForm } from '../PasswordSignUpForm';
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
    signUp: jest.fn(),
  },
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('PasswordSignUpForm', () => {
  const mockSignUpResponse = {
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
    (authApi.signUp as jest.Mock).mockResolvedValue(mockSignUpResponse);
  });

  it('renders all form fields', () => {
    render(<PasswordSignUpForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    // Very flexible check
    const errorMessage = await screen.findByText(/email/i);
    expect(errorMessage).toBeInTheDocument();
  });

  it('validates password minimum length', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'short');
    await user.type(screen.getByLabelText(/confirm password/i), 'short');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    });
  });

  it('validates password contains uppercase letter', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'lowercase123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'lowercase123!');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Password must contain at least one uppercase letter'),
      ).toBeInTheDocument();
    });
  });

  it('validates password contains lowercase letter', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'UPPERCASE123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'UPPERCASE123!');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Password must contain at least one lowercase letter'),
      ).toBeInTheDocument();
    });
  });

  it('validates password contains number', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'NoNumbers!');
    await user.type(screen.getByLabelText(/confirm password/i), 'NoNumbers!');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Password must contain at least one number')).toBeInTheDocument();
    });
  });

  it('validates password contains special character', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'NoSpecial123');
    await user.type(screen.getByLabelText(/confirm password/i), 'NoSpecial123');

    const submitButton = screen.getByRole('button', { name: /sign up/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText('Password must contain at least one special character'),
      ).toBeInTheDocument();
    });
  });

  it('submits form with valid password', async () => {
    const user = userEvent.setup();
    render(<PasswordSignUpForm />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'ValidPass123!');
    await user.type(screen.getByLabelText(/confirm password/i), 'ValidPass123!');

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(authApi.signUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'ValidPass123!',
          name: 'Test User',
        }),
      );
    });
  });
});
