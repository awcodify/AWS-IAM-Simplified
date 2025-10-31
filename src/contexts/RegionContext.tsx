'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DEFAULT_AWS_REGION, DEFAULT_IDENTITY_CENTER_REGION } from '@/constants/regions';

interface RegionContextType {
  awsRegion: string;
  identityCenterRegion: string;
  setAwsRegion: (region: string) => void;
  setIdentityCenterRegion: (region: string) => void;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

interface RegionProviderProps {
  children: ReactNode;
}

export function RegionProvider({ children }: RegionProviderProps) {
  // Initialize AWS Operations region with localStorage fallback
  const [awsRegion, setAwsRegionState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aws-region');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_AWS_DEFAULT_REGION || DEFAULT_AWS_REGION;
  });

  // Initialize Identity Center region with localStorage fallback
  const [identityCenterRegion, setIdentityCenterRegionState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('identity-center-region');
      if (saved) return saved;
    }
    return process.env.NEXT_PUBLIC_AWS_SSO_REGION || DEFAULT_IDENTITY_CENTER_REGION;
  });

  // Persist AWS Operations region to localStorage
  const setAwsRegion = (region: string) => {
    setAwsRegionState(region);
    if (typeof window !== 'undefined') {
      localStorage.setItem('aws-region', region);
    }
  };

  // Persist Identity Center region to localStorage
  const setIdentityCenterRegion = (region: string) => {
    setIdentityCenterRegionState(region);
    if (typeof window !== 'undefined') {
      localStorage.setItem('identity-center-region', region);
    }
  };

  const value: RegionContextType = {
    awsRegion,
    identityCenterRegion,
    setAwsRegion,
    setIdentityCenterRegion,
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
  
  // Return with backward compatibility alias
  return {
    ...context,
    ssoRegion: context.identityCenterRegion, // Backward compatibility
  };
}

export default RegionContext;
