'use client';

import { useState } from 'react';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export const CookieSettingsButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="hover:text-foreground transition-colors underline underline-offset-4"
      >
        Cookie Settings
      </button>

      <CookiePreferencesModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
