import React from 'react';

interface PdfIconProps {
  className?: string;
  size?: number;
}

const PDF_ICON_SRC = '/images/pdf-icon.svg';

/**
 * PDF icon from SVG Repo (pdf-file-svgrepo-com.svg).
 * Renders the document-with-PDF-text icon for content links.
 */
export function PdfIcon({ className = 'h-6 w-6', size }: PdfIconProps) {
  return (
    <img src={PDF_ICON_SRC} alt="" width={size} height={size} className={className} aria-hidden />
  );
}
