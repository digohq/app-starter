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
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { organizationsApi, UserOrganization, OrgRole } from '@/lib/organizations-api';
import { Loader2, Copy, Check, Mail } from 'lucide-react';

const inviteSchema = z.object({
  organizationId: z.string().min(1, 'Please select a organization'),
  email: z
    .string()
    .email('Email must be a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  role: z.nativeEnum(OrgRole).refine((r) => r === OrgRole.ADMIN || r === OrgRole.MEMBER, {
    message: 'Choose Admin or Editor',
  }),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteOrganizationMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultOrganizationId?: string;
}

export function InviteOrganizationMembersDialog({
  open,
  onOpenChange,
  defaultOrganizationId,
}: InviteOrganizationMembersDialogProps) {
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<{
    inviteUrl: string;
    email?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      organizationId: defaultOrganizationId || '',
      email: '',
      role: OrgRole.MEMBER,
    },
  });

  useEffect(() => {
    if (open) {
      loadOrganizations();
    } else {
      // Reset form when dialog closes
      form.reset({
        organizationId: defaultOrganizationId || '',
        email: '',
        role: OrgRole.MEMBER,
      });
      setCreatedInvite(null);
      setCopied(false);
    }
  }, [open, defaultOrganizationId]);

  const loadOrganizations = async () => {
    setIsLoadingOrganizations(true);
    try {
      const response = await organizationsApi.getUserOrganizations();
      // Filter to only organizations where user is OWNER, ADMIN, or MEMBER
      const manageableOrganizations = response.organizations.filter(
        (g) => g.role === 'OWNER' || g.role === 'ADMIN' || g.role === 'MEMBER',
      );
      setOrganizations(manageableOrganizations);

      // Auto-select organization if there's exactly one organization or if defaultOrganizationId is provided
      if (defaultOrganizationId) {
        // Verify user has access to defaultOrganizationId
        if (manageableOrganizations.some((g) => g.id === defaultOrganizationId)) {
          form.setValue('organizationId', defaultOrganizationId);
        }
      } else if (manageableOrganizations.length === 1) {
        form.setValue('organizationId', manageableOrganizations[0].id);
      }
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to load organizations');
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      const response = await organizationsApi.createInvite(data.organizationId, {
        email: data.email || undefined,
        role: data.role,
      });

      setCreatedInvite({
        inviteUrl: response.inviteUrl,
        email: response.email || undefined,
      });

      if (data.email) {
        toast.success(`Invitation sent to ${data.email}`);
      } else {
        toast.success('Invitation link created');
      }
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to create invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdInvite) return;

    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      setCopied(true);
      toast.success('Invitation link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleCreateAnother = () => {
    setCreatedInvite(null);
    form.reset();
    setCopied(false);
  };

  if (organizations.length === 0 && !isLoadingOrganizations) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Organizers</DialogTitle>
            <DialogDescription>
              You need to be an owner, admin, or editor of a organization to invite organizers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {createdInvite ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation Created</DialogTitle>
              <DialogDescription>
                {createdInvite.email
                  ? `Invitation email has been sent to ${createdInvite.email}`
                  : 'Share this link with collaborators to invite them to your organization'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input value={createdInvite.inviteUrl} readOnly className="font-mono text-sm" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p>
                  {createdInvite.email
                    ? 'The recipient will receive an email with instructions to accept the invitation.'
                    : 'Copy this link and share it via email, SMS, or any messaging platform. The link will be valid for 6 months.'}
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCreateAnother}>
                Create Another
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invite Organizers</DialogTitle>
              <DialogDescription>
                Create an invitation link to add organizers to your organization. You can send it
                via email or share the link directly.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {organizations.length > 1 && (
                  <FormField
                    control={form.control}
                    name="organizationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isLoadingOrganizations}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {organizations.map((organization) => (
                              <SelectItem key={organization.id} value={organization.id}>
                                {organization.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role for new member</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={OrgRole.ADMIN}>Admin</SelectItem>
                          <SelectItem value={OrgRole.MEMBER}>Editor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This role is applied when they accept the invitation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="Enter email to send invitation"
                            className="pl-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        If provided, an invitation email will be sent. Otherwise, you can share the
                        link manually.
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
                        Creating...
                      </>
                    ) : (
                      'Create Invitation'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
