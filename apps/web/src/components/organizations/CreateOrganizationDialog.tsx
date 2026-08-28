'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreateOrganizationForm } from './CreateOrganizationForm';
import { OrganizationResponse } from '@/lib/organizations-api';

interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (organization: OrganizationResponse) => void;
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate and organize events together.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <CreateOrganizationForm
            onSuccess={(organization) => {
              onSuccess(organization);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
