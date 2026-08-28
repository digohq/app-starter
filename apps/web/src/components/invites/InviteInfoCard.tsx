import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User } from 'lucide-react';

interface InviteInfoCardProps {
  organizationName?: string;
  inviterName?: string;
  expirationDate?: string;
}

export function InviteInfoCard({
  organizationName,
  inviterName,
  expirationDate,
}: InviteInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {organizationName || 'Organization Invitation'}
        </CardTitle>
        {inviterName && <CardDescription>Invited by {inviterName}</CardDescription>}
      </CardHeader>
      {expirationDate && (
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Expires: {new Date(expirationDate).toLocaleDateString()}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
