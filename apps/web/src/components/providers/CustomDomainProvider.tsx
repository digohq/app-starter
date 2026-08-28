'use client';

import React, { createContext, useContext } from 'react';

interface CustomDomainContextType {
  currentDomain: string | null;
  currentOrganizationId: string | null;
}

const CustomDomainContext = createContext<CustomDomainContextType>({
  currentDomain: null,
  currentOrganizationId: null,
});

export function CustomDomainProvider({
  domain,
  organizationId,
  children,
}: {
  domain: string | null;
  organizationId: string | null;
  children: React.ReactNode;
}) {
  return (
    <CustomDomainContext.Provider
      value={{ currentDomain: domain, currentOrganizationId: organizationId }}
    >
      {children}
    </CustomDomainContext.Provider>
  );
}

export function useCustomDomain() {
  return useContext(CustomDomainContext);
}
