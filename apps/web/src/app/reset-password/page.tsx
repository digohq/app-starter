'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { PasswordStrengthIndicator } from '@/components/landing/PasswordStrengthIndicator';
import { authApi } from '@/lib/auth-api';
import { authStorage } from '@/lib/auth-storage';
import { ArrowLeft, Mail, Lock } from 'lucide-react';

const requestResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    token: z.string().min(1, 'Reset token is required'),
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

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: emailParam || authStorage.getLastEmail() || '',
    },
  });

  const resetForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: emailParam || authStorage.getLastEmail() || '',
      token: token || '',
      password: '',
      confirmPassword: '',
    },
  });

  // Update form when URL params change
  useEffect(() => {
    if (emailParam) {
      requestForm.setValue('email', emailParam);
      resetForm.setValue('email', emailParam);
    } else {
      // If no email param, try to load from storage
      const savedEmail = authStorage.getLastEmail();
      if (savedEmail) {
        requestForm.setValue('email', savedEmail);
        resetForm.setValue('email', savedEmail);
      }
    }
    if (token) {
      resetForm.setValue('token', token);
    }
  }, [emailParam, token, requestForm, resetForm]);

  const onRequestReset = async (data: RequestResetFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      await authApi.requestPasswordReset({ email: data.email });
      setEmailSent(true);
      toast.success('Password reset link sent! Check your email.');
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      const errorMessage =
        apiError.message || 'Failed to send password reset email. Please try again.';
      toast.error(errorMessage);
      requestForm.setError('root', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onResetPassword = async (data: ResetPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.resetPassword({
        email: data.email,
        token: data.token,
        password: data.password,
      });
      toast.success('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      if (apiError.statusCode === 400) {
        const errorMessage =
          apiError.message || 'Invalid or expired reset token. Please request a new one.';
        toast.error(errorMessage);
        resetForm.setError('root', {
          message: errorMessage,
        });
      } else {
        const errorMessage = apiError.message || 'Failed to reset password. Please try again.';
        toast.error(errorMessage);
        resetForm.setError('root', {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show reset password form if token is present
  if (token) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Link>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-2xl">Reset Your Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...resetForm}>
                <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
                  <FormField
                    control={resetForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="you@example.com" {...field} disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Enter your new password"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              setPassword(e.target.value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Must be at least 8 characters with uppercase, lowercase, number, and
                          special character
                        </FormDescription>
                        <PasswordStrengthIndicator password={password} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={resetForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <PasswordInput placeholder="Confirm your new password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {resetForm.formState.errors.root && (
                    <p className="text-sm font-medium text-destructive">
                      {resetForm.formState.errors.root.message}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show request reset form
  if (emailSent) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to login
          </Link>
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Mail className="h-6 w-6 text-success" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We&apos;ve sent a password reset link to {requestForm.getValues('email')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Click the link in the email to reset your password. The link will expire in 1
                  hour.
                </p>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Didn&apos;t receive the email?</p>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const email = requestForm.getValues('email');
                      if (email) {
                        setIsLoading(true);
                        try {
                          // Save email for future use
                          authStorage.setLastEmail(email);
                          await authApi.requestPasswordReset({ email });
                          toast.success('Password reset link sent! Check your email.');
                        } catch (error: unknown) {
                          const apiError = error as { message?: string; statusCode?: number };
                          const errorMessage =
                            apiError.message ||
                            'Failed to send password reset email. Please try again.';
                          toast.error(errorMessage);
                        } finally {
                          setIsLoading(false);
                        }
                      }
                    }}
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sending...' : 'Resend Email'}
                  </Button>
                </div>
                <div className="text-center">
                  <Link href="/login" className="text-sm text-primary hover:underline">
                    Back to login
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to login
        </Link>
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...requestForm}>
              <form onSubmit={requestForm.handleSubmit(onRequestReset)} className="space-y-4">
                <FormField
                  control={requestForm.control}
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
                {requestForm.formState.errors.root && (
                  <p className="text-sm font-medium text-destructive">
                    {requestForm.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
            <div className="mt-4 text-center">
              <Link href="/login" className="text-sm text-primary hover:underline">
                Remember your password? Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
