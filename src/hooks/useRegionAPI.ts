'use client';

import { useEffect, useRef } from 'react';
import { useRegion } from '@/contexts/RegionContext';

interface UseRegionAPIOptions {
  onRegionChange?: (awsRegion: string, ssoRegion: string) => void;
  skipInitialCall?: boolean;
}

/**
 * Custom hook that provides region information and automatically calls a callback
 * when regions change. Useful for API calls that depend on region selection.
 */
export function useRegionAPI(options: UseRegionAPIOptions = {}) {
  const { awsRegion, identityCenterRegion, setAwsRegion } = useRegion();
  const { onRegionChange, skipInitialCall = false } = options;
  const hasInitialCallRef = useRef(false);

  useEffect(() => {
    if (onRegionChange) {
      // Skip initial call if requested
      if (skipInitialCall && !hasInitialCallRef.current) {
        hasInitialCallRef.current = true;
        return;
      }
      
      onRegionChange(awsRegion, identityCenterRegion);
    }
  }, [awsRegion, identityCenterRegion, onRegionChange, skipInitialCall]);

  return {
    awsRegion,
    identityCenterRegion,
    setAwsRegion,
  };
}

export default useRegionAPI;
