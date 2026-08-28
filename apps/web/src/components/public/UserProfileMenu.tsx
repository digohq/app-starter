'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/auth-utils';
import { authStorage, AUTH_CHANGE_EVENT } from '@/lib/auth-storage';
import { authApi } from '@/lib/auth-api';
import { User, LogOut, Settings, UserCog, Calendar } from 'lucide-react';
import { navigateToApp } from '@/lib/utils';

import { useAuth } from '@/hooks/use-auth';

export function UserProfileMenu() {
  const router = useRouter();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const handleProfileClick = () => {
    navigateToApp('/profile/edit', router);
  };

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="h-8 w-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name || 'User'} />}
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(user.name, user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {user && (
          <>
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        {user.username && (
          <DropdownMenuItem onClick={() => navigateToApp(`/users/${user.username}`, router)}>
            <User className="mr-2 h-4 w-4" />
            View Profile
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleProfileClick}>
          <UserCog className="mr-2 h-4 w-4" />
          Edit Profile
        </DropdownMenuItem>
        {(user.defaultCalendarId || user.defaultCalendarSlug) && (
          <DropdownMenuItem onClick={() => navigateToApp('/my-calendar/edit', router)}>
            <Calendar className="mr-2 h-4 w-4" />
            Edit My Calendar
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => navigateToApp('/settings/notifications', router)}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
