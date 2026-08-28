import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('does not render when password is empty', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows weak strength for short password', () => {
    render(<PasswordStrengthIndicator password="short" />);
    expect(screen.getByText(/weak/i)).toBeInTheDocument();
  });

  it('shows fair strength for medium password', () => {
    render(<PasswordStrengthIndicator password="MediumPass" />);
    expect(screen.getByText(/fair/i)).toBeInTheDocument();
  });

  it('shows good strength for strong password', () => {
    render(<PasswordStrengthIndicator password="GoodPass123" />);
    expect(screen.getByText(/good/i)).toBeInTheDocument();
  });

  it('shows strong strength for very strong password', () => {
    render(<PasswordStrengthIndicator password="VeryStrong123!" />);
    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('renders 5 strength bars', () => {
    const { container } = render(<PasswordStrengthIndicator password="Test123!" />);
    const bars = container.querySelectorAll('.h-1');
    expect(bars).toHaveLength(5);
  });
});
