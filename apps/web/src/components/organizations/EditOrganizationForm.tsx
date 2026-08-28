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

const editOrganizationSchema = z.object({
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
    .url('Must be a valid URL')
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

type EditOrganizationFormData = z.infer<typeof editOrganizationSchema>;

export interface EditOrganizationFormProps {
  initialData: {
    id: string;
    name: string;
    description?: string | null;
    location?: string | null;
    website?: string | null;
    logoUrl?: string | null;
  };
  onSuccess?: (organization: OrganizationResponse) => void;
  onCancel?: () => void;
}

export function EditOrganizationForm({
  initialData,
  onSuccess,
  onCancel,
}: EditOrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<EditOrganizationFormData>({
    resolver: zodResolver(editOrganizationSchema) as any,
    defaultValues: {
      name: initialData.name,
      description: initialData.description || '',
      location: initialData.location || '',
      website: initialData.website || '',
      logoUrl: initialData.logoUrl || '',
    },
  });

  const onSubmit = async (data: EditOrganizationFormData) => {
    setIsSubmitting(true);
    try {
      const organization = await organizationsApi.updateOrganization(initialData.id, {
        name: data.name,
        description: data.description || undefined,
        location: data.location || undefined,
        website: data.website || undefined,
        logoUrl: data.logoUrl || undefined,
      });

      toast.success('Organization updated successfully!');

      if (onSuccess) {
        onSuccess(organization);
      } else {
        router.push(`/organizations/${initialData.id}`);
      }
    } catch (error: unknown) {
      const apiError = error as { message?: string; statusCode?: number };
      const errorMessage = apiError.message || 'Failed to update organization. Please try again.';
      toast.error(errorMessage);
      form.setError('root', { message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
        <FormField
          control={form.control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What does this organization do?"
                  rows={4}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (optional)</FormLabel>
              <FormControl>
                <Input placeholder="San Francisco, CA" {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
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
          control={form.control as any}
          name="logoUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo URL (optional)</FormLabel>
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
            onClick={onCancel ?? (() => router.back())}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
