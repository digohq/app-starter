'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, User as UserIcon } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usersApi, UserSearchResult } from '@/lib/users-api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserSearchSelectProps {
  onSelect: (user: UserSearchResult) => void;
  excludeUserIds?: string[];
  placeholder?: string;
  className?: string;
}

export function UserSearchSelect({
  onSelect,
  excludeUserIds = [],
  placeholder = 'Search users...',
  className,
}: UserSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [users, setUsers] = React.useState<UserSearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!debouncedQuery) {
      setUsers([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        const results = await usersApi.searchUsers(debouncedQuery);
        setUsers(results.filter((u) => !excludeUserIds.includes(u.id)));
      } catch (error) {
        console.error('Failed to search users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery, excludeUserIds]);

  const handleSelect = (user: UserSearchResult) => {
    onSelect(user);
    setOpen(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          {/* shouldFilter=false because we filter server-side */}
          <CommandInput
            placeholder="Type name or email..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            {!loading && debouncedQuery && users.length === 0 && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}
            <CommandGroup>
              {!loading &&
                users.map((user) => (
                  <CommandItem key={user.id} value={user.id} onSelect={() => handleSelect(user)}>
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>
                          <UserIcon className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="truncate font-medium">{user.name || 'Unnamed User'}</span>
                        <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                      </div>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4',
                          'opacity-0', // Always hidden as this is a selector, logic handled by parent
                        )}
                      />
                    </div>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
