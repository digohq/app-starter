'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { authStorage } from '@/lib/auth-storage';
import { redirectAfterAuth } from '@/lib/auth-utils';

const passwordLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const otpLoginSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

type PasswordLoginFormData = z.infer<typeof passwordLoginSchema>;
type EmailFormData = z.infer<typeof emailSchema>;
type OtpLoginFormData = z.infer<typeof otpLoginSchema>;

interface LoginFormProps {
  onSwitchToSignup?: () => void;
}

export function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [method, setMethod] = useState<'password' | 'otp'>('password');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');
  const intentParam = searchParams.get('intent');

  // Prefer email from URL (e.g., from invitation), then saved email
  const savedEmail = emailParam || authStorage.getLastEmail() || '';

  const passwordForm = useForm<PasswordLoginFormData>({
    resolver: zodResolver(passwordLoginSchema),
    defaultValues: {
      email: savedEmail,
      password: '',
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: savedEmail,
    },
  });

  const otpForm = useForm<OtpLoginFormData>({
    resolver: zodResolver(otpLoginSchema),
    defaultValues: {
      email: savedEmail,
      otp: '',
    },
  });

  // Update form values when email parameter changes
  useEffect(() => {
    if (emailParam) {
      passwordForm.setValue('email', emailParam);
      emailForm.setValue('email', emailParam);
      otpForm.setValue('email', emailParam);
    }
  }, [emailParam, passwordForm, emailForm, otpForm]);

  const onPasswordSubmit = async (data: PasswordLoginFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      const response = await authApi.login(data);
      authStorage.setTokens(response.accessToken, response.refreshToken);
      authStorage.setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
      });
      toast.success('Login successful!');
      toast.success('Login successful!');
      let redirectPath;

      if (redirectParam) {
        redirectPath = await redirectAfterAuth(redirectParam);
      } else if (intentParam === 'presentation') {
        redirectPath = '/create-topic?from=login';
      } else if (intentParam === 'calendar') {
        redirectPath = '/organizations/create';
      } else if (intentParam === 'collaboration') {
        redirectPath = '/events/create';
      } else {
        redirectPath = await redirectAfterAuth(null);
      }

      router.push(redirectPath);
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      const errorMessage = apiError.message || 'Login failed. Please try again.';
      toast.error(errorMessage);
      passwordForm.setError('root', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      await authApi.requestOtpForLogin({ email: data.email });
      toast.success('Verification code sent to your email');
      setEmail(data.email);
      otpForm.setValue('email', data.email);
      setStep('otp');
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      const errorMessage =
        apiError.message || 'Failed to send verification code. Please try again.';
      toast.error(errorMessage);
      emailForm.setError('root', {
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOtpSubmit = async (data: OtpLoginFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      const response = await authApi.loginWithOtp({
        email: data.email,
        otp: data.otp,
      });
      authStorage.setTokens(response.accessToken, response.refreshToken);
      authStorage.setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
      });
      toast.success('Login successful!');
      toast.success('Login successful!');
      let redirectPath;

      if (redirectParam) {
        redirectPath = await redirectAfterAuth(redirectParam);
      } else if (intentParam === 'presentation') {
        redirectPath = '/create-topic?from=login';
      } else if (intentParam === 'calendar') {
        redirectPath = '/organizations/create';
      } else if (intentParam === 'collaboration') {
        redirectPath = '/events/create';
      } else {
        redirectPath = await redirectAfterAuth(null);
      }

      router.push(redirectPath);
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      if (apiError.statusCode === 400) {
        const errorMessage = apiError.message || 'Invalid verification code. Please try again.';
        toast.error(errorMessage);
        otpForm.setError('otp', {
          message: errorMessage,
        });
      } else {
        const errorMessage = apiError.message || 'Login failed. Please try again.';
        toast.error(errorMessage);
        otpForm.setError('root', {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Tabs
        value={method}
        onValueChange={(v) => {
          if (v === 'password' || v === 'otp') {
            setMethod(v);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="password">Email & Password</TabsTrigger>
          <TabsTrigger value="otp">One-Time Code</TabsTrigger>
        </TabsList>
        <TabsContent value="otp">
          {step === 'email' ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
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
                {emailForm.formState.errors.root && (
                  <p className="text-sm font-medium text-destructive">
                    {emailForm.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => {
                      const currentEmail = emailForm.getValues('email');
                      setStep('otp');
                      otpForm.reset({
                        email: currentEmail || '',
                        otp: '',
                      });
                    }}
                    className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                  >
                    I already have a code
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
                {email ? (
                  <div className="text-sm text-muted-foreground mb-4">
                    We sent a verification code to {email}
                  </div>
                ) : (
                  <>
                    <FormField
                      control={otpForm.control}
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
                  </>
                )}
                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Verification Code</FormLabel>
                      <FormControl>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            disabled={field.disabled}
                            name={field.name}
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {otpForm.formState.errors.root && (
                  <p className="text-sm font-medium text-destructive">
                    {otpForm.formState.errors.root.message}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Verify & Log In'}
                </Button>
                <div className="text-center mt-2">
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => {
                      const currentEmail = otpForm.getValues('email');
                      setStep('email');
                      if (currentEmail) {
                        emailForm.setValue('email', currentEmail);
                      }
                    }}
                    className="p-0 h-auto font-normal text-muted-foreground hover:text-primary text-sm"
                  >
                    Request a code instead
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </TabsContent>
        <TabsContent value="password">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
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
                control={passwordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {passwordForm.formState.errors.root && (
                <p className="text-sm font-medium text-destructive">
                  {passwordForm.formState.errors.root.message}
                </p>
              )}
              <div className="text-right">
                <a
                  href={`/reset-password${passwordForm.watch('email') ? `?email=${encodeURIComponent(passwordForm.watch('email'))}` : ''}`}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
      {onSwitchToSignup && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          Don&apos;t have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToSignup();
            }}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Sign up for an account
          </a>
        </div>
      )}
    </div>
  );
}
