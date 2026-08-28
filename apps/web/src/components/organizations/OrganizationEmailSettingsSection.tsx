'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail, User } from 'lucide-react';
import { organizationsApi } from '@/lib/organizations-api';
import { cn } from '@/lib/utils';

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

interface OrganizationEmailSettingsSectionProps {
  organizationId: string;
  role: OrgRole;
  initialEmailReplyTo?: string | null;
  initialEmailSenderName?: string | null;
  className?: string;
}

export function OrganizationEmailSettingsSection({
  organizationId,
  role,
  initialEmailReplyTo,
  initialEmailSenderName,
  className,
}: OrganizationEmailSettingsSectionProps) {
  const canManage = role === 'OWNER' || role === 'ADMIN';
  const [emailReplyTo, setEmailReplyTo] = React.useState(initialEmailReplyTo || '');
  const [emailSenderName, setEmailSenderName] = React.useState(initialEmailSenderName || '');
  const [saving, setSaving] = React.useState(false);

  // Update local state when initial values change (e.g. after a refresh)
  React.useEffect(() => {
    setEmailReplyTo(initialEmailReplyTo || '');
    setEmailSenderName(initialEmailSenderName || '');
  }, [initialEmailReplyTo, initialEmailSenderName]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    try {
      await organizationsApi.updateEmailSettings(organizationId, {
        emailReplyTo: emailReplyTo.trim() || null,
        emailSenderName: emailSenderName.trim() || null,
      });
      toast.success('Email settings updated successfully');
    } catch (e) {
      console.error(e);
      toast.error('Could not update email settings');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return null;
  }

  return (
    <section
      className={cn('rounded-lg border bg-card text-card-foreground p-6 space-y-6', className)}
    >
      <div className="flex items-start gap-3">
        <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Email Branding</h2>
          <p className="text-sm text-muted-foreground">
            Customize how speaker communication emails appear to recipients.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-2">
            <Label htmlFor="email-sender-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Sender Name
            </Label>
            <Input
              id="email-sender-name"
              value={emailSenderName}
              onChange={(e) => setEmailSenderName(e.target.value)}
              placeholder="e.g. App Starter Team"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              The name that will appear in the "From" field. Defaults to "App Starter".
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-reply-to" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Reply-To Address
            </Label>
            <Input
              id="email-reply-to"
              type="email"
              value={emailReplyTo}
              onChange={(e) => setEmailReplyTo(e.target.value)}
              placeholder="e.g. contact@yourorganization.com"
            />
            <p className="text-xs text-muted-foreground">
              The email address where speaker replies will be sent.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Email Settings'}
        </Button>
      </form>
    </section>
  );
}
