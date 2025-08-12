'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface RegionContextType {
  awsRegion: string;
  ssoRegion: string;
  setAwsRegion: (region: string) => void;
  // SSO region comes from env, so no setter needed
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

interface RegionProviderProps {
  children: ReactNode;
}

export function RegionProvider({ children }: RegionProviderProps) {
  // Initialize with environment defaults and localStorage
  const [awsRegion, setAwsRegionState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aws-region');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_AWS_DEFAULT_REGION || 'us-east-1';
  });

  // SSO region comes from environment variables
  const ssoRegion = process.env.NEXT_PUBLIC_AWS_SSO_REGION || 'us-east-1';

  // Persist AWS region to localStorage
  const setAwsRegion = (region: string) => {
    setAwsRegionState(region);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aws-region', region);
    }
  };

  const value: RegionContextType = {
    awsRegion,
    ssoRegion,
    setAwsRegion,
  };

  return (
    <RegionContext.Provider value={value}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (context === undefined) {
    throw new Error('useRegion must be used within a RegionProvider');
  }
  return context;
}

export default RegionContext;
