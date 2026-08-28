'use client';

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
import { AlertTriangle } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeave: () => void;
  onStay?: () => void;
  title?: string;
  description?: string;
  leaveLabel?: string;
  stayLabel?: string;
}

export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onLeave,
  onStay,
  title = 'Unsaved Changes',
  description = 'You have unsaved changes. Are you sure you want to leave? All unsaved changes will be lost.',
  leaveLabel = 'Leave Without Saving',
  stayLabel = 'Stay on Page',
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => {
              onOpenChange(false);
              onStay?.();
            }}
          >
            {stayLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              onLeave();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {leaveLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
