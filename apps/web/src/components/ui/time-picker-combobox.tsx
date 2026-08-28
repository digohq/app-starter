import * as React from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

interface TimePickerComboboxProps {
  value?: string;
  onChange?: (time: string) => void;
  placeholder?: string;
  className?: string;
}

export function TimePickerCombobox({
  value = '9:00 AM',
  onChange,
  placeholder = 'Select time',
  className,
}: TimePickerComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [timeInput, setTimeInput] = React.useState<string>(value);
  const [error, setError] = React.useState<string>('');
  const selectedTimeRef = React.useRef<HTMLDivElement>(null);
  const matchedTimeRef = React.useRef<HTMLDivElement>(null);

  // Generate all time options in 15-minute increments with AM/PM format
  const generateTimeOptions = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const period = hour < 12 ? 'AM' : 'PM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
        times.push(timeStr);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  // Parse and validate exact time input
  const parseExactTime = (input: string): string | null => {
    if (!input.trim()) return null;

    const cleanInput = input.trim();

    // Try to parse exact time formats: 1:07AM, 1:07 AM, 1:07am, 13:07, 22:30
    const exactTimePattern = /^(\d{1,2}):(\d{2})\s*(a|p|am|pm)?$/i;
    const match = cleanInput.match(exactTimePattern);

    if (match) {
      let hour = parseInt(match[1]);
      const minute = parseInt(match[2]);
      const periodStr = match[3] || '';

      // Validate minute
      if (minute < 0 || minute > 59) return null;

      // Validate hour
      if (hour < 0 || hour > 23) return null;

      // Convert 24-hour format to 12-hour format
      let period: string;
      let displayHour: number;

      if (!periodStr) {
        // No AM/PM specified, assume 24-hour format
        period = hour < 12 ? 'AM' : 'PM';
        displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      } else {
        // AM/PM specified
        if (hour > 12) return null; // Invalid: can't have 13:00 PM
        period = periodStr.toLowerCase().startsWith('a') ? 'AM' : 'PM';
        displayHour = hour;
      }

      return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    }

    return null;
  };

  // Fuzzy match time input to find closest match
  const fuzzyMatchTime = (input: string): string | null => {
    if (!input.trim()) return null;

    // First, try to parse as exact time
    const exactTime = parseExactTime(input);
    if (exactTime) return exactTime;

    // Remove spaces and convert to lowercase for matching
    const cleanInput = input.trim().toLowerCase().replace(/\s+/g, '');

    // Try to parse various formats
    let hour: number | null = null;
    let minute = 0;
    let period = '';

    // Match patterns like: 3, 3p, 3pm, 22, 20 (24-hour single numbers)
    const patterns = [/^(\d{1,2})(:(\d{2}))?\s*(a|p|am|pm)?$/i];

    for (const pattern of patterns) {
      const match = cleanInput.match(pattern);
      if (match) {
        hour = parseInt(match[1]);
        minute = match[3] ? parseInt(match[3]) : 0;
        period = match[4] || '';
        break;
      }
    }

    if (hour === null || hour < 0 || hour > 23) {
      return null;
    }

    // Handle 24-hour format (numbers > 12)
    let displayHour: number;
    let normalizedPeriod: string;

    if (hour > 12 && !period) {
      // Convert 24-hour to 12-hour PM
      displayHour = hour - 12;
      normalizedPeriod = 'PM';
    } else if (hour === 0 && !period) {
      // Midnight
      displayHour = 12;
      normalizedPeriod = 'AM';
    } else if (!period) {
      // Default to PM for single digit hours 1-11, AM for 12
      displayHour = hour;
      normalizedPeriod = hour === 12 ? 'AM' : 'PM';
    } else {
      // Period specified
      if (hour > 12) return null;
      displayHour = hour;
      normalizedPeriod = period.toLowerCase().startsWith('a') ? 'AM' : 'PM';
    }

    // Round minutes to nearest 15
    const roundedMinute = Math.round(minute / 15) * 15;
    const finalMinute = roundedMinute === 60 ? 0 : roundedMinute;

    // Find the closest match in timeOptions
    const searchTime = `${displayHour}:${finalMinute.toString().padStart(2, '0')} ${normalizedPeriod}`;

    // Find exact or closest match
    const exactMatch = timeOptions.find((t) => t === searchTime);
    if (exactMatch) return exactMatch;

    // Find closest time
    return timeOptions.find((t) => t.startsWith(`${displayHour}:`)) || null;
  };

  // Scroll to selected or matched time when dropdown opens or input changes
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const matchedTime = fuzzyMatchTime(timeInput);
        if (matchedTime && matchedTimeRef.current) {
          matchedTimeRef.current.scrollIntoView({ block: 'start' });
        } else if (selectedTimeRef.current) {
          selectedTimeRef.current.scrollIntoView({ block: 'start' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open, timeInput]);

  // Update timeInput when value prop changes
  React.useEffect(() => {
    if (value) {
      setTimeInput(value);
    }
  }, [value]);

  const handleTimeSelect = (selectedTime: string) => {
    onChange?.(selectedTime);
    setTimeInput(selectedTime);
    setOpen(false);
    setError('');
  };

  const handleInputChange = (inputValue: string) => {
    setTimeInput(inputValue);
    if (inputValue) {
      const matched = fuzzyMatchTime(inputValue);
      if (matched) {
        setError('');
      } else {
        setError('Invalid time format');
      }
    } else {
      setError('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const matched = fuzzyMatchTime(timeInput);
      if (matched) {
        handleTimeSelect(matched);
      } else if (timeInput.trim()) {
        setError('Invalid time format');
      }
    }
  };

  const handleBlur = () => {
    const matched = fuzzyMatchTime(timeInput);
    if (matched) {
      handleTimeSelect(matched);
    } else if (timeInput.trim()) {
      setError('Invalid time format');
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-start text-left font-normal',
              error && 'border-destructive',
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {value}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0 bg-popover z-50" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={timeInput}
              onValueChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className="h-9"
            />
            <CommandList className="max-h-[300px]">
              <CommandEmpty>No time found</CommandEmpty>
              <CommandGroup>
                {timeOptions.map((timeOption) => {
                  const isSelected = value === timeOption;
                  const matchedTime = fuzzyMatchTime(timeInput);
                  const isMatched = matchedTime === timeOption;
                  return (
                    <CommandItem
                      key={timeOption}
                      value={timeOption}
                      onSelect={handleTimeSelect}
                      ref={
                        // Cast so ref is accepted when cmdk types resolve to Ref<never> (e.g. on Railway)
                        (isMatched ? matchedTimeRef : isSelected ? selectedTimeRef : undefined) as
                          | (React.Ref<HTMLDivElement> & React.Ref<never>)
                          | undefined
                      }
                      className={cn(isSelected && 'bg-accent')}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                      />
                      {timeOption}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
