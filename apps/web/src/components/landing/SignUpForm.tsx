'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OtpSignUpForm } from './OtpSignUpForm';
import { PasswordSignUpForm } from './PasswordSignUpForm';

interface SignUpFormProps {
  onSwitchToLogin?: () => void;
}

export function SignUpForm({ onSwitchToLogin }: SignUpFormProps) {
  const [method, setMethod] = useState<'otp' | 'password'>('password');

  return (
    <div>
      <Tabs
        value={method}
        onValueChange={(v) => {
          if (v === 'otp' || v === 'password') {
            setMethod(v);
          }
        }}
      >
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="password">Email & Password</TabsTrigger>
          <TabsTrigger value="otp">One-Time Code</TabsTrigger>
        </TabsList>
        <TabsContent value="otp">
          <OtpSignUpForm />
        </TabsContent>
        <TabsContent value="password">
          <PasswordSignUpForm />
        </TabsContent>
      </Tabs>
      {onSwitchToLogin && (
        <div className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onSwitchToLogin();
            }}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Log in
          </a>
        </div>
      )}
    </div>
  );
}
