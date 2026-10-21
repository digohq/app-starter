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

// Mirrors CreateVideoDto on the API so most mistakes are caught before a request.
const videoSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters'),
  url: z
    .string()
    .trim()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .refine((value) => /^https?:\/\/\S+$/i.test(value), 'Enter a valid http or https URL'),
});

export type VideoFormData = z.infer<typeof videoSchema>;

interface VideoFormProps {
  onSubmit: (data: VideoFormData) => Promise<void>;
}

export const VideoForm = ({ onSubmit }: VideoFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VideoFormData>({
    resolver: zodResolver(videoSchema) as any,
    defaultValues: { name: '', url: '' },
  });

  const handleSubmit = async (data: VideoFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
    } catch {
      // The caller has already shown the error; keep the values so the user can retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
        <FormField
          control={form.control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video name</FormLabel>
              <FormControl>
                <Input placeholder="Product launch demo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Video URL</FormLabel>
              <FormControl>
                <Input type="url" inputMode="url" placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit video'}
        </Button>
      </form>
    </Form>
  );
};
