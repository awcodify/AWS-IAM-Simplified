import { useState, useEffect } from 'react';
import { createAuthHeaders } from '@/lib/credentials';

interface AccountCapabilities {
  hasOrganizationAccess: boolean;
  hasSSOAccess: boolean;
  isChecking: boolean;
  organizationError?: string;
  ssoError?: string;
}

export function useAccountCapabilities(awsRegion: string, ssoRegion: string) {
  const [capabilities, setCapabilities] = useState<AccountCapabilities>({
    hasOrganizationAccess: false,
    hasSSOAccess: false,
    isChecking: true,
  });

  useEffect(() => {
    const checkCapabilities = async () => {
      if (!awsRegion || !ssoRegion) {
        setCapabilities({
          hasOrganizationAccess: false,
          hasSSOAccess: false,
          isChecking: false,
        });
        return;
      }

      setCapabilities(prev => ({ ...prev, isChecking: true }));

      // Check organization access
      const checkOrganization = async () => {
        const response = await fetch(
          `/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`,
          {
            headers: createAuthHeaders(),
            cache: 'no-store',
          }
        );
        const data = await response.json();
        return {
          hasAccess: response.ok && data.success && Array.isArray(data.data),
          error: !response.ok || !data.success ? data.error : undefined
        };
      };

      // Check SSO access
      const checkSSO = async () => {
        const response = await fetch(
          `/api/permission-sets?ssoRegion=${encodeURIComponent(ssoRegion)}`,
          {
            headers: createAuthHeaders(),
            cache: 'no-store',
          }
        );
        const data = await response.json();
        return {
          hasAccess: response.ok && data.success && Array.isArray(data.data),
          error: !response.ok || !data.success ? data.error : undefined
        };
      };

      // Run checks in parallel
      const [orgResult, ssoResult] = await Promise.all([
        checkOrganization().catch(() => ({ hasAccess: false, error: 'Failed to check organization access' })),
        checkSSO().catch(() => ({ hasAccess: false, error: 'Failed to check SSO access' })),
      ]);

      setCapabilities({
        hasOrganizationAccess: orgResult.hasAccess,
        hasSSOAccess: ssoResult.hasAccess,
        isChecking: false,
        organizationError: orgResult.error,
        ssoError: ssoResult.error,
      });
    };

    checkCapabilities();
  }, [awsRegion, ssoRegion]);

  return capabilities;
}
