'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Separator } from '@/components/ui/separator';

const emailSubmissionSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Name is required')
      .max(255, 'Name must be less than 255 characters')
      .trim(),
    email: z
      .string()
      .email('Email must be a valid email address')
      .max(255, 'Email must be less than 255 characters'),
    confirmEmail: z.string().email('Confirm email must be a valid email address'),
  })
  .refine((data) => data.email === data.confirmEmail, {
    message: 'Email addresses do not match',
    path: ['confirmEmail'],
  });

type EmailSubmissionFormData = z.infer<typeof emailSubmissionSchema>;

interface AcceptInviteFormProps {
  token: string;
  organizationName?: string;
  inviterName?: string;
  isAuthenticated: boolean;
  onSuccess: () => void;
  onAccept: (token: string) => Promise<void>;
  onSubmitEmail: (token: string, data: EmailSubmissionFormData) => Promise<void>;
}

export function AcceptInviteForm({
  token,
  organizationName,
  inviterName,
  isAuthenticated,
  onSuccess,
  onAccept,
  onSubmitEmail,
}: AcceptInviteFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EmailSubmissionFormData>({
    resolver: zodResolver(emailSubmissionSchema),
    defaultValues: {
      name: '',
      email: '',
      confirmEmail: '',
    },
  });

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onAccept(token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: EmailSubmissionFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await onSubmitEmail(token, data);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Authenticated user flow - simple accept button
  if (isAuthenticated) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <Button onClick={handleAccept} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting...
            </>
          ) : (
            'Accept Invitation'
          )}
        </Button>
      </div>
    );
  }

  // Unauthenticated user flow - email submission form
  if (isSubmitted) {
    return (
      <div className="p-4 border border-success rounded-md bg-success/10 text-success text-sm">
        Verification email sent! Please check your inbox and click the verification link.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <GoogleAuthButton mode="signup" invitationToken={token} className="mb-4" />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {error && (
            <div className="p-4 border border-destructive rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} />
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
                  <Input type="email" placeholder="Enter your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Confirm your email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
