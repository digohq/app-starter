'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

const otpSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  otp: z.string().min(1, 'OTP is required').length(6, 'OTP must be 6 digits'),
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
});

type EmailFormData = z.infer<typeof emailSchema>;
type OtpFormData = z.infer<typeof otpSchema>;

export function OtpSignUpForm() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');
  const intentParam = searchParams.get('intent');

  // Prefer email from URL (e.g., from invitation), then saved email
  const initialEmail = emailParam || authStorage.getLastEmail() || '';

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: initialEmail,
      name: '',
    },
  });

  const otpForm = useForm<OtpFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email: '',
      otp: '',
      name: '',
    },
    mode: 'onSubmit',
  });

  // Update form values when email parameter changes
  useEffect(() => {
    if (emailParam) {
      emailForm.setValue('email', emailParam);
    }
  }, [emailParam, emailForm]);

  // Ensure form values are synced when moving to OTP step
  useEffect(() => {
    if (step === 'otp') {
      const currentEmail = otpForm.getValues('email');
      if (!currentEmail && email) {
        otpForm.setValue('email', email);
      }

      const currentName = otpForm.getValues('name');
      if (!currentName && name) {
        otpForm.setValue('name', name);
      }
    }
  }, [step, email, name, otpForm]);

  const onEmailSubmit = async (data: EmailFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      await authApi.requestOtp({ email: data.email });
      toast.success('Verification code sent to your email');
      setEmail(data.email);
      setName(data.name);
      // Set form values and trigger validation
      otpForm.reset({
        email: data.email,
        name: data.name,
        otp: '',
      });
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

  const onOtpSubmit = async (data: OtpFormData) => {
    setIsLoading(true);
    try {
      // Save email for future use
      authStorage.setLastEmail(data.email);
      const { authApi } = await import('@/lib/auth-api');
      const response = await authApi.signUpWithOtp({
        email: data.email,
        otp: data.otp,
        name: data.name,
        intent: intentParam || undefined,
      });
      authStorage.setTokens(response.accessToken, response.refreshToken);
      authStorage.setUser({
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
      });
      toast.success('Account created successfully!');
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
        const errorMessage = apiError.message || 'Sign up failed. Please try again.';
        toast.error(errorMessage);
        otpForm.setError('root', {
          message: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'email') {
    return (
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <FormField
            control={emailForm.control}
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
                const currentName = emailForm.getValues('name');
                setStep('otp');
                otpForm.reset({
                  email: currentEmail || '',
                  name: currentName || '',
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
    );
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Form submit event triggered');
    console.log('Form values:', otpForm.getValues());
    console.log('Form errors:', otpForm.formState.errors);
    console.log('Form is valid:', otpForm.formState.isValid);
    console.log('Form is dirty:', otpForm.formState.isDirty);

    otpForm.handleSubmit(
      (data) => {
        console.log('Form validation passed, submitting with data:', data);
        onOtpSubmit(data);
      },
      (errors) => {
        console.log('Form validation failed with errors:', errors);
        console.log('Current form values:', otpForm.getValues());
      },
    )(e);
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Button clicked');
    console.log('Button disabled:', isLoading);
    console.log('Form values:', otpForm.getValues());
    console.log('Form errors:', otpForm.formState.errors);
    // Don't prevent default - let the form submit naturally
  };

  return (
    <Form {...otpForm}>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        {email ? (
          <>
            <div className="text-sm text-muted-foreground mb-4">
              We sent a verification code to {email}
            </div>
            {/* Hidden email field to ensure it's always in the form */}
            <FormField
              control={otpForm.control}
              name="email"
              render={({ field }) => <input type="hidden" {...field} value={field.value || ''} />}
            />
          </>
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
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification Code</FormLabel>
              <FormControl>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={field.value ?? ''}
                    onChange={(value) => {
                      console.log('OTP onChange - value:', value);
                      field.onChange(value ?? '');
                    }}
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
        {otpForm.formState.errors.otp && (
          <p className="text-sm font-medium text-destructive">
            {otpForm.formState.errors.otp.message}
          </p>
        )}
        {otpForm.formState.errors.name && (
          <p className="text-sm font-medium text-destructive">
            {otpForm.formState.errors.name.message}
          </p>
        )}
        {otpForm.formState.errors.email && (
          <p className="text-sm font-medium text-destructive">
            {otpForm.formState.errors.email.message}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={isLoading} onClick={handleButtonClick}>
          {isLoading ? 'Verifying...' : 'Verify & Sign Up'}
        </Button>

        <div className="text-center mt-2">
          <Button
            variant="link"
            type="button"
            onClick={() => {
              const currentEmail = otpForm.getValues('email');
              const currentName = otpForm.getValues('name');
              setStep('email');
              if (currentEmail) {
                emailForm.setValue('email', currentEmail);
              }
              if (currentName) {
                emailForm.setValue('name', currentName);
              }
            }}
            className="p-0 h-auto font-normal text-muted-foreground hover:text-primary text-sm"
          >
            Request a code instead
          </Button>
        </div>
      </form>
    </Form>
  );
}
