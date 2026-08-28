import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { TimePickerCombobox } from './time-picker-combobox';

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

// Helper function to convert Date to 12-hour time string (e.g., "12:00 PM")
// Rounds minutes to the nearest 15-minute increment to match TimePickerCombobox options
function dateToTimeString(date: Date): string {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  // Round to nearest 15-minute increment
  const roundedMinutes = Math.round(minutes / 15) * 15;
  if (roundedMinutes === 60) {
    minutes = 0;
    hours = (hours + 1) % 24;
  } else {
    minutes = roundedMinutes;
  }

  const period = hours < 12 ? 'AM' : 'PM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Helper function to convert 12-hour time string (e.g., "12:00 PM") to hours and minutes
function timeStringToHoursMinutes(timeString: string): { hours: number; minutes: number } {
  const match = timeString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return { hours: 12, minutes: 0 };
  }

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3].toUpperCase();

  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date & time',
  disabled = false,
  className,
  label,
  error,
}: DateTimePickerProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = React.useState<string>(() => {
    return value ? dateToTimeString(value) : '12:00 PM';
  });
  const selectedTimeRef = React.useRef<string>(selectedTime);
  const [open, setOpen] = React.useState(false);

  // Keep ref in sync with state
  React.useEffect(() => {
    selectedTimeRef.current = selectedTime;
  }, [selectedTime]);

  // Computed values
  const combinedDateTime = React.useMemo(() => {
    if (!selectedDate) return undefined;
    const { hours, minutes } = timeStringToHoursMinutes(selectedTime);
    return new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes,
    );
  }, [selectedDate, selectedTime]);

  // Update internal state when external value changes
  React.useEffect(() => {
    if (value) {
      setSelectedDate(value);
      setSelectedTime(dateToTimeString(value));
    } else {
      setSelectedDate(undefined);
      setSelectedTime('12:00 PM');
    }
  }, [value]);

  const handleDateChange = (newDate: Date | undefined) => {
    setSelectedDate(newDate);
    // Create the combined datetime and notify parent
    if (newDate) {
      // Use ref to get the latest selectedTime value to avoid stale closures
      const currentTime = selectedTimeRef.current;
      const { hours, minutes } = timeStringToHoursMinutes(currentTime);
      const combinedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        hours,
        minutes,
      );
      onChange?.(combinedDate);
      // Don't auto-close here - wait for both date and time to be selected
    } else {
      onChange?.(undefined);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setSelectedTime(newTime);
    // Create the combined datetime and notify parent
    if (selectedDate) {
      const { hours, minutes } = timeStringToHoursMinutes(newTime);
      const combinedDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
      );
      onChange?.(combinedDate);
    }
  };

  const handleConfirm = () => {
    // Ensure we send the current combined date when confirming
    if (combinedDateTime) {
      onChange?.(combinedDateTime);
    }
    setOpen(false);
  };

  // When popover closes, ensure we preserve the current value if both date and time are set
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && combinedDateTime) {
      // Popover is closing, ensure we have the latest value
      onChange?.(combinedDateTime);
    }
    setOpen(newOpen);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !combinedDateTime && 'text-muted-foreground',
              error && 'border-destructive',
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {combinedDateTime ? (
              format(combinedDateTime, "PPP 'at' HH:mm")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateChange}
              initialFocus
              className="pointer-events-auto border-b"
            />
            <div className="p-4 flex items-center justify-between gap-2">
              <TimePickerCombobox
                value={selectedTime}
                onChange={handleTimeChange}
                placeholder="Select time"
                className="flex-1"
              />
              <Button onClick={handleConfirm} size="sm">
                Confirm
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
