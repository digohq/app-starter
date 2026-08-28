import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DnsConfigurationInstructionsProps {
  domain: string;
  verificationToken: string;
}

export function DnsConfigurationInstructions({
  domain,
  verificationToken,
}: DnsConfigurationInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const verificationDomain = `_app-starter-verify.${domain}`;

  return (
    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border border-slate-200 dark:border-slate-800">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
          1
        </span>
        Add TXT Record for Verification
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Add the following TXT record to your DNS provider (Cloudflare, AWS Route53, Namecheap, etc.)
        to verify ownership of your domain.
      </p>

      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Type
            </label>
            <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm">
              TXT
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Host / Name
            </label>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
              <code className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap flex-grow">
                {verificationDomain}
              </code>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => copyToClipboard(verificationDomain, 'host')}
              >
                {copiedField === 'host' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            Value / Content
          </label>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
            <code className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap flex-grow">
              {verificationToken}
            </code>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => copyToClipboard(verificationToken, 'value')}
            >
              {copiedField === 'value' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 border-t border-slate-200 dark:border-slate-800 pt-6">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">
          2
        </span>
        Configure CNAME Record
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        Once verified, add a CNAME record to point your domain to our servers.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            Type
          </label>
          <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm">
            CNAME
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            Host / Name
          </label>
          <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm overflow-hidden text-ellipsis">
            {domain.split('.').length > 2 ? domain.split('.').slice(0, -2).join('.') : '@'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
            Value / Content
          </label>
          <div className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 font-mono text-sm">
            localhost:3000
          </div>
        </div>
      </div>
    </div>
  );
}
