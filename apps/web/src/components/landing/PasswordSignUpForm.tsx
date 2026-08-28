'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { authStorage } from '@/lib/auth-storage';
import { redirectAfterAuth } from '@/lib/auth-utils';

const passwordSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(
        /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/,
        'Password must contain at least one special character',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type PasswordSignUpFormData = z.infer<typeof passwordSchema>;

export function PasswordSignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');
  const intentParam = searchParams.get('intent');

  // Prefer email from URL (e.g., from invitation), then saved email
  const initialEmail = emailParam || authStorage.getLastEmail() || '';

  const form = useForm<PasswordSignUpFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      name: '',
      email: initialEmail,
      password: '',
      confirmPassword: '',
    },
  });

  // Update form value when email parameter changes
  useEffect(() => {
    if (emailParam) {
      form.setValue('email', emailParam);
    }
  }, [emailParam, form]);

  const onSubmit = async (data: PasswordSignUpFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      const response = await authApi.signUp({
        email: data.email,
        password: data.password,
        name: data.name,
        redirectUrl: redirectParam || undefined,
        intent: intentParam || undefined,
      });
      authStorage.setTokens(response.accessToken, response.refreshToken);
      authStorage.setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
      });
      toast.success('Account created! Please check your email to verify your account.');
      // Redirect to a page that shows email verification message
      let redirectPath = '/verify-email-pending';

      if (redirectParam) {
        // If there's an explicit redirect, we might want to go there?
        // But usually verifying email is key. However, if user is logged in, we can redirect.
        // The original code redirected to /verify-email-pending even if redirectParam existed.
        // Let's assume verifying is important usually.
        // But for "presentation" intent, we want direct access.
        redirectPath = '/verify-email-pending';
      }

      if (intentParam === 'presentation') {
        redirectPath = '/create-topic?from=login';
      } else if (intentParam === 'calendar') {
        redirectPath = '/organizations/create';
      } else if (intentParam === 'collaboration') {
        redirectPath = '/events/create';
      }

      router.push(redirectPath);
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      if (apiError.statusCode === 409) {
        const errorMessage = 'This email is already registered. Please log in instead.';
        toast.error(errorMessage);
        form.setError('email', {
          message: errorMessage,
        });
      } else {
        const errorMessage = apiError.message || 'Sign up failed. Please try again.';
        toast.error(errorMessage);
        form.setError('root', {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input type="text" placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="Create a password"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setPassword(e.target.value);
                  }}
                />
              </FormControl>
              <FormDescription>
                Must be at least 8 characters with uppercase, lowercase, number, and special
                character
              </FormDescription>
              <PasswordStrengthIndicator password={password} />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder="Confirm your password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
}
