import { Calendar, Users, MessageSquare, UserPlus, CheckCircle, Bell } from 'lucide-react';

export function getNotificationIcon(type: string, invitationType?: string) {
  if (type === 'invitation') {
    switch (invitationType) {
      case 'organization':
        return Users;
      case 'speaker':
      case 'session-speaker':
        return MessageSquare;
      case 'organizer':
      case 'session-organizer':
        return Calendar;
      default:
        return UserPlus;
    }
  } else if (type === 'acceptance') {
    return CheckCircle;
  }
  return Bell;
}

export function getNotificationColor(type: string, invitationType?: string): string {
  if (type === 'invitation') {
    switch (invitationType) {
      case 'organization':
        return 'bg-primary/10 text-primary';
      case 'speaker':
      case 'session-speaker':
        return 'bg-secondary/10 text-secondary';
      case 'organizer':
      case 'session-organizer':
        return 'bg-[hsl(var(--cerulean))]/10 text-[hsl(var(--cerulean))]';
      default:
        return 'bg-primary/10 text-primary';
    }
  } else if (type === 'acceptance') {
    return 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]';
  }
  return 'bg-muted text-muted-foreground';
}

export function getNotificationActionText(type: string, invitationType?: string): string {
  if (type === 'invitation') {
    switch (invitationType) {
      case 'organization':
        return 'Join Organization';
      case 'speaker':
        return 'View Speaker Invite';
      case 'session-speaker':
        return 'View Session';
      case 'organizer':
        return 'View Event';
      case 'session-organizer':
        return 'View Session';
      default:
        return 'View Invitation';
    }
  } else if (type === 'acceptance') {
    return 'View Details';
  }
  return 'View';
}

export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}
