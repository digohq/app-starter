import React from 'react';

interface XIconProps {
  className?: string;
  size?: number;
}

/**
 * X (formerly Twitter) platform icon
 * Official X logo SVG
 */
export function XIcon({ className = 'h-4 w-4', size }: XIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      width={size}
      height={size}
      aria-label="X"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
