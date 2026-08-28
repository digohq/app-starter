'use client';

import * as React from 'react';
import { Check, Copy, ExternalLink, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface CopyUrlProps {
  url: string;
  className?: string;
  label?: string; // Optional label to show instead of the full URL
  showUrl?: boolean; // Whether to show the URL text
}

export function CopyUrl({ url, className, label, showUrl = true }: CopyUrlProps) {
  const [copied, setCopied] = React.useState(false);
  const [origin, setOrigin] = React.useState('');

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fullUrl = origin && url.startsWith('/') ? `${origin}${url}` : url;

  const onCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      {showUrl && (
        <Link
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline hover:text-foreground truncate max-w-[300px] flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <LinkIcon className="h-3 w-3 inline-block mr-1 opacity-70" />
          {label || fullUrl}
          <ExternalLink className="h-3 w-3 inline-block opacity-50" />
        </Link>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 relative"
        onClick={onCopy}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
        <span className="sr-only">Copy URL</span>
        {copied && (
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded shadow-sm whitespace-nowrap animate-in fade-in zoom-in duration-200 z-50">
            Copied!
          </span>
        )}
      </Button>
    </div>
  );
}
