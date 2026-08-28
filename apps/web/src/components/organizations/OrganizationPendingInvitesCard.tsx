'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { organizationsApi, OrgRole } from '@/lib/organizations-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Mail, Ban } from 'lucide-react';

interface OrganizationPendingInvitesCardProps {
  organizationId: string;
}

export function OrganizationPendingInvitesCard({
  organizationId,
}: OrganizationPendingInvitesCardProps) {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<
    Awaited<ReturnType<typeof organizationsApi.getOrganizationInvites>>['invites']
  >([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizationsApi.getOrganizationInvites(organizationId, {
        status: 'pending',
      });
      setInvites(res.invites);
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || 'Failed to load pending invites');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleResend = async (inviteId: string) => {
    setBusyId(inviteId);
    try {
      await organizationsApi.resendOrganizationInvite(organizationId, inviteId);
      toast.success('Invitation resent');
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || 'Could not resend');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    setBusyId(inviteId);
    try {
      await organizationsApi.cancelInvite(organizationId, inviteId);
      toast.success('Invitation revoked');
      await load();
    } catch (e) {
      const err = e as { message?: string };
      toast.error(err.message || 'Could not revoke');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </CardContent>
      </Card>
    );
  }

  if (invites.length === 0) {
    return null;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Pending invitations</CardTitle>
        <CardDescription>
          Invites that have not been accepted yet. You can resend the email or revoke access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  {inv.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {inv.email}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Link-only</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{inv.role === OrgRole.ADMIN ? 'Admin' : 'Member'}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{inv.status}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(inv.createdAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  {inv.email ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busyId === inv.id}
                      onClick={() => void handleResend(inv.id)}
                    >
                      {busyId === inv.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Resend'}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={busyId === inv.id}
                    onClick={() => void handleRevoke(inv.id)}
                  >
                    <Ban className="h-3.5 w-3.5 mr-1" />
                    Revoke
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
