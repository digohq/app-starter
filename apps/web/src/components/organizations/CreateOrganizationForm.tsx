'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { organizationsApi, OrganizationResponse } from '@/lib/organizations-api';

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters')
    .trim(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(255, 'Location must be less than 255 characters')
    .trim()
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Website must be a valid URL')
    .max(500, 'Website must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  logoUrl: z
    .string()
    .url('Logo URL must be a valid URL')
    .max(500, 'Logo URL must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

type CreateOrganizationFormData = z.infer<typeof createOrganizationSchema>;

export interface CreateOrganizationFormProps {
  onSuccess?: (organization: OrganizationResponse) => void;
  onCancel?: () => void;
}

export function CreateOrganizationForm({ onSuccess, onCancel }: CreateOrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<CreateOrganizationFormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      website: '',
      logoUrl: '',
    },
  });

  const onSubmit = async (data: CreateOrganizationFormData) => {
    setIsSubmitting(true);
    try {
      const organization = await organizationsApi.createOrganization({
        name: data.name,
        description: data.description,
        location: data.location || undefined,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
      });

      toast.success('Organization created successfully!');

      if (onSuccess) {
        onSuccess(organization);
      } else {
        router.push('/dashboard');
      }
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      const errorMessage = apiError.message || 'Failed to create organization. Please try again.';
      toast.error(errorMessage);
      form.setError('root', {
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Organization Name <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your organization name"
                  {...field}
                  value={field.value ?? ''}
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell people what your organization is about..."
                  rows={4}
                  {...field}
                  value={field.value ?? ''}
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="City or region" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website (optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <div className="text-sm text-destructive">{form.formState.errors.root.message}</div>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
