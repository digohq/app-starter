'use client';

import * as React from 'react';
import { Check, Globe } from 'lucide-react';
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

const LAST_TIMEZONE_KEY = 'app_starter_last_timezone';

// Get all supported timezones from Intl, or fallback to a basic list
const ALL_TIMEZONES =
  typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? Intl.supportedValuesOf('timeZone')
    : [
        'UTC',
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Paris',
        'Asia/Tokyo',
        'Asia/Singapore',
        'Australia/Sydney',
      ];

interface TimezonePickerProps {
  value?: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  className?: string;
  /** Forwarded to the trigger button (e.g. id, aria-label) for label association. */
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
}

/**
 * A type-ahead timezone picker that remembers the last used timezone.
 */
export function TimezonePicker({
  value,
  onChange,
  placeholder = 'Select timezone...',
  className,
  ...triggerProps
}: TimezonePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Initial load: if no value is provided, try to load from localStorage or browser default
  React.useEffect(() => {
    if (!value && typeof window !== 'undefined') {
      const savedTz = localStorage.getItem(LAST_TIMEZONE_KEY);
      if (savedTz && ALL_TIMEZONES.includes(savedTz)) {
        onChange(savedTz);
      } else {
        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (ALL_TIMEZONES.includes(browserTz)) {
          onChange(browserTz);
        }
      }
    }
  }, [value, onChange]);

  const handleSelect = (tz: string) => {
    onChange(tz);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_TIMEZONE_KEY, tz);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-start text-left font-normal h-9', className)}
          {...triggerProps}
        >
          <Globe className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <span className="truncate">{value || placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder="Search timezone..." className="h-9" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {ALL_TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => handleSelect(tz)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === tz ? 'opacity-100' : 'opacity-0')}
                  />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
