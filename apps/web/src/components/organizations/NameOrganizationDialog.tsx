'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { organizationsApi } from '@/lib/organizations-api';
import { Loader2 } from 'lucide-react';

const nameOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(255, 'Organization name must be less than 255 characters')
    .trim(),
});

type NameOrganizationFormData = z.infer<typeof nameOrganizationSchema>;

interface NameOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentOrganizationName: string;
  onSuccess: () => void;
}

export function NameOrganizationDialog({
  open,
  onOpenChange,
  organizationId,
  currentOrganizationName,
  onSuccess,
}: NameOrganizationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NameOrganizationFormData>({
    resolver: zodResolver(nameOrganizationSchema),
    defaultValues: {
      name: currentOrganizationName,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: currentOrganizationName });
    }
  }, [open, currentOrganizationName, form]);

  const onSubmit = async (data: NameOrganizationFormData) => {
    setIsSubmitting(true);
    try {
      await organizationsApi.updateOrganization(organizationId, {
        name: data.name,
      });

      toast.success('Organization name updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as { message?: string; statusCode?: number };
      toast.error(apiError.message || 'Failed to update organization name');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Name Your Collaboration Organization</DialogTitle>
          <DialogDescription>
            Give your organization a name to help identify it. You can change this later in your
            organization settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your organization name"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    This name will be visible to all members of your organization.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Name'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
