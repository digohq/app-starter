'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { authStorage, StoredUser } from '@/lib/auth-storage';
import { CheckCircle2, Bell } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';

export default function SettingsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(authStorage.getUser());
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <div className="mt-8 space-y-6">
        <Link href="/settings/notifications" className="block">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="space-y-1">
                <CardTitle className="text-xl">Notifications</CardTitle>
                <CardDescription>
                  Manage your email and in-app notification preferences.
                </CardDescription>
              </div>
              <Bell className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Configure when and how you want to be notified.
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>Manage your linked social accounts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted rounded-full">
                  <GoogleIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.googleId ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>

              {user?.googleId ? (
                <div className="flex items-center text-green-600 gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Connected</span>
                </div>
              ) : (
                <GoogleAuthButton mode="login" label="Connect" className="w-auto h-9" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
