'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { organizationsApi } from '@/lib/organizations-api';
import { cn } from '@/lib/utils';

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

interface OrganizationDangerZoneSectionProps {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
  className?: string;
}

export function OrganizationDangerZoneSection({
  organizationId,
  organizationName,
  role,
  className,
}: OrganizationDangerZoneSectionProps) {
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Only the owner can delete a organization.
  if (role !== 'OWNER') {
    return null;
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await organizationsApi.deleteOrganization(organizationId);
      toast.success('Organization deleted successfully');
      router.push('/dashboard');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete organization');
      setIsDeleting(false);
      setIsAlertOpen(false);
    }
  };

  return (
    <Card className={cn('border-destructive/50', className)}>
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete this organization. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setIsAlertOpen(true)}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash className="h-4 w-4 mr-2" />
          )}
          Delete Organization
        </Button>
      </CardContent>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the organization
              <strong> &quot;{organizationName}&quot;</strong> along with all of its calendars,
              events, sessions, members, and invites.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Organization
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
