import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings2, CheckCheck, XCircle, RefreshCcw } from 'lucide-react';
import { BulkUpdateAction } from '@/types/notifications';

interface BulkPreferenceControlsProps {
  onBulkUpdate: (action: BulkUpdateAction, options?: any) => void;
  isLoading?: boolean;
}

export const BulkPreferenceControls: React.FC<BulkPreferenceControlsProps> = ({
  onBulkUpdate,
  isLoading,
}) => {
  return (
    <div className="flex justify-end mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={isLoading} className="h-8">
            <Settings2 className="mr-2 h-3.5 w-3.5" />
            Quick Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Manage All Notifications</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onBulkUpdate('enable_all', { enabled: true })}>
            <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
            Enable all
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onBulkUpdate('disable_all', { enabled: false })}>
            <XCircle className="mr-2 h-4 w-4 text-red-500" />
            Disable all optional
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onBulkUpdate('reset_to_defaults')}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Reset to defaults
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
