import { render, screen, fireEvent } from '@testing-library/react';
import { GoogleAuthButton } from '../GoogleAuthButton';
import { authApi } from '@/lib/auth-api';

jest.mock('@/lib/auth-api', () => ({
  authApi: {
    initiateGoogleAuth: jest.fn(),
  },
}));

describe('GoogleAuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly for login', () => {
    render(<GoogleAuthButton mode="login" />);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
  });

  it('renders correctly for signup', () => {
    render(<GoogleAuthButton mode="signup" />);
    expect(screen.getByText('Sign up with Google')).toBeInTheDocument();
  });

  it('calls initiateGoogleAuth on click', () => {
    render(<GoogleAuthButton mode="login" />);
    fireEvent.click(screen.getByRole('button'));
    expect(authApi.initiateGoogleAuth).toHaveBeenCalled();
  });

  it('passes invitation token if provided', () => {
    render(<GoogleAuthButton mode="login" invitationToken="test-token" />);
    fireEvent.click(screen.getByRole('button'));
    expect(authApi.initiateGoogleAuth).toHaveBeenCalledWith('invitation:test-token');
  });

  it('is disabled when disabled prop is true', () => {
    render(<GoogleAuthButton mode="login" disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
