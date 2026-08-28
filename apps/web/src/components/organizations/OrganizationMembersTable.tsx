'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Users } from 'lucide-react';
import { OrganizationUser, organizationsApi } from '@/lib/organizations-api';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrganizationMembersTableProps {
  users: OrganizationUser[];
  currentUserId?: string;
  currentUserRole?: string;
  organizationId: string;
  onUserClick?: (userId: string) => void;
  onUserRemoved?: () => void;
}

function RoleBadge({ role }: { role: string }): React.JSX.Element {
  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'MEMBER':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Badge variant="outline" className={getRoleStyle(role)}>
      {role}
    </Badge>
  );
}

function StatusBadge({ lastLoginAt }: { lastLoginAt: string | null }): React.JSX.Element {
  if (!lastLoginAt) {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Never
      </Badge>
    );
  }

  const lastLogin = new Date(lastLoginAt);
  const now = new Date();
  const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLogin === 0) {
    return (
      <Badge variant="secondary" className="bg-success-light text-success border-success/20">
        Active
      </Badge>
    );
  } else if (daysSinceLogin <= 7) {
    return (
      <Badge
        variant="secondary"
        className="bg-warning-light text-warning-foreground border-warning/20"
      >
        Recent
      </Badge>
    );
  } else {
    return (
      <Badge variant="secondary" className="bg-muted text-muted-foreground">
        Inactive
      </Badge>
    );
  }
}

function TableActions({
  userId,
  organizationId,
  currentUserId,
  currentUserRole,
  userRole,
  onRemove,
  onRoleChange,
}: {
  userId: string;
  organizationId: string;
  currentUserId?: string;
  currentUserRole?: string;
  userRole: string;
  onRemove?: (userId: string, organizationId: string) => void;
  onRoleChange?: (userId: string, organizationId: string, newRole: string) => void;
}) {
  const isCurrentUser = userId === currentUserId;
  // Only OWNER and ADMIN can manage roles
  const canManageRoles =
    currentUserRole && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN');

  const canRemove = userRole && currentUserRole;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {!isCurrentUser && (
          <>
            <DropdownMenuItem onClick={() => console.log('View', userId)}>
              View Details
            </DropdownMenuItem>
            {canManageRoles && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    // Role change will be handled by the Select in the table cell
                  }}
                  onSelect={(e) => e.preventDefault()}
                >
                  Change Role
                </DropdownMenuItem>
              </>
            )}
            {canRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onRemove?.(userId, organizationId)}
                  className="text-destructive"
                >
                  Remove from Organization
                </DropdownMenuItem>
              </>
            )}
          </>
        )}
        {isCurrentUser && <DropdownMenuItem disabled>This is you</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function OrganizationMembersTable({
  users,
  currentUserId,
  currentUserRole,
  organizationId,
  onUserClick,
  onUserRemoved,
}: OrganizationMembersTableProps) {
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [changingRoleUserId, setChangingRoleUserId] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState(false);

  // Only OWNER and ADMIN can manage roles
  const canManageRoles =
    currentUserRole && (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN');

  const handleRemoveClick = (userId: string) => {
    setRemovingUserId(userId);
  };

  const handleConfirmRemove = async () => {
    if (!removingUserId) return;

    setIsRemoving(true);
    try {
      await organizationsApi.removeOrganizationUser(organizationId, removingUserId);
      toast.success('User removed from organization successfully');
      setRemovingUserId(null);
      onUserRemoved?.();
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to remove user from organization');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (changingRoleUserId === userId && isChangingRole) return;

    setChangingRoleUserId(userId);
    setIsChangingRole(true);
    try {
      await organizationsApi.updateOrganizationUserRole(
        organizationId,
        userId,
        newRole as 'OWNER' | 'ADMIN' | 'MEMBER',
      );
      toast.success('User role updated successfully');
      onUserRemoved?.(); // Reload users
    } catch (error) {
      const apiError = error as { message?: string };
      toast.error(apiError.message || 'Failed to update user role');
    } finally {
      setIsChangingRole(false);
      setChangingRoleUserId(null);
    }
  };

  const userToRemove = users.find((u) => u.userId === removingUserId);

  return (
    <Card>
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          Members ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[180px]">Name</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell min-w-[120px]">Last Login</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">
                Joined Organization
              </TableHead>
              <TableHead className="text-right min-w-[60px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No members found
                </TableCell>
              </TableRow>
            ) : (
              users.map((organizationUser) => (
                <TableRow
                  key={organizationUser.id}
                  className="organization cursor-pointer"
                  onClick={() => onUserClick?.(organizationUser.userId)}
                >
                  <TableCell className="px-3 sm:px-4">
                    <div>
                      <div className="font-medium text-sm sm:text-base">
                        {organizationUser.user.name || '--'}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                        {organizationUser.user.email}
                      </div>
                      {/* Show status on mobile */}
                      <div className="sm:hidden mt-1">
                        <StatusBadge lastLoginAt={organizationUser.user.lastLoginAt} />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 sm:px-4" onClick={(e) => e.stopPropagation()}>
                    {canManageRoles &&
                    organizationUser.userId !== currentUserId &&
                    organizationUser.role !== 'OWNER' ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                        <Select
                          value={organizationUser.role}
                          onValueChange={(newRole) =>
                            handleRoleChange(organizationUser.userId, newRole)
                          }
                          disabled={
                            isChangingRole && changingRoleUserId === organizationUser.userId
                          }
                        >
                          <SelectTrigger className="w-full sm:w-[120px] h-8 text-xs sm:text-sm">
                            <SelectValue>
                              <span className="text-xs font-medium">{organizationUser.role}</span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">OWNER</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="MEMBER">MEMBER</SelectItem>
                          </SelectContent>
                        </Select>
                        {isChangingRole && changingRoleUserId === organizationUser.userId && (
                          <span className="text-xs text-muted-foreground">Updating...</span>
                        )}
                      </div>
                    ) : (
                      <RoleBadge role={organizationUser.role} />
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell px-3 sm:px-4">
                    <StatusBadge lastLoginAt={organizationUser.user.lastLoginAt} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground">
                    {organizationUser.user.lastLoginAt
                      ? format(new Date(organizationUser.user.lastLoginAt), 'MMM d, yyyy')
                      : 'Never'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell px-3 sm:px-4 text-xs sm:text-sm text-muted-foreground">
                    {format(new Date(organizationUser.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell
                    className="text-right px-3 sm:px-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <TableActions
                      userId={organizationUser.userId}
                      organizationId={organizationId}
                      currentUserId={currentUserId}
                      currentUserRole={currentUserRole}
                      userRole={organizationUser.role}
                      onRemove={handleRemoveClick}
                      onRoleChange={handleRoleChange}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={removingUserId !== null}
        onOpenChange={(open) => !open && setRemovingUserId(null)}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription className="text-left sm:text-left">
              Are you sure you want to remove{' '}
              <strong>{userToRemove?.user.name || userToRemove?.user.email}</strong> from this
              organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isRemoving} className="w-full sm:w-auto">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
