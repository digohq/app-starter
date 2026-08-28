'use client';

import { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { level: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) score++;

    if (score <= 2) return { level: score, label: 'Weak', color: 'text-destructive' };
    if (score <= 3) return { level: score, label: 'Fair', color: 'text-warning' };
    if (score <= 4) return { level: score, label: 'Good', color: 'text-primary' };
    return { level: score, label: 'Strong', color: 'text-success' };
  }, [password]);

  if (!password) return null;

  const getBarColor = (index: number) => {
    if (index > strength.level) return 'bg-muted';
    if (strength.level <= 2) return 'bg-destructive';
    if (strength.level <= 3) return 'bg-warning';
    if (strength.level <= 4) return 'bg-primary';
    return 'bg-success';
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded ${getBarColor(i)}`} />
        ))}
      </div>
      <p className={`text-xs ${strength.color}`}>{strength.label}</p>
    </div>
  );
}
