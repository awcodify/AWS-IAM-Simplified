import { useState, useEffect } from 'react';
import { createAuthHeaders } from '@/lib/credentials';

interface AccountCapabilities {
  hasManagementAccess: boolean; // Has both Organization + SSO (Identity Center)
  hasIAMAccess: boolean; // Can access IAM in current account (always true)
  isChecking: boolean;
  managementError?: string;
}

export function useAccountCapabilities(awsRegion: string, ssoRegion: string) {
  const [capabilities, setCapabilities] = useState<AccountCapabilities>({
    hasManagementAccess: false,
    hasIAMAccess: true, // IAM is always available in any account
    isChecking: true,
  });

  useEffect(() => {
    const checkCapabilities = async () => {
      if (!awsRegion || !ssoRegion) {
        setCapabilities({
          hasManagementAccess: false,
          hasIAMAccess: true,
          isChecking: false,
        });
        return;
      }

      setCapabilities(prev => ({ ...prev, isChecking: true }));

      // Check management account access (Organization + SSO)
      // If account has organization access, it should also have SSO
      const checkManagement = async () => {
        // First check organization access
        const orgResponse = await fetch(
          `/api/organization/accounts?region=${encodeURIComponent(awsRegion)}`,
          {
            headers: createAuthHeaders(),
            cache: 'no-store',
          }
        );
        const orgData = await orgResponse.json();
        const hasOrgAccess = orgResponse.ok && orgData.success && Array.isArray(orgData.data);

        // If no org access, not a management account
        if (!hasOrgAccess) {
          return {
            hasAccess: false,
            error: orgData.error || 'Not a management account'
          };
        }

        // Check SSO access (should be available in management account)
        const ssoResponse = await fetch(
          `/api/permission-sets?region=${encodeURIComponent(awsRegion)}&ssoRegion=${encodeURIComponent(ssoRegion)}`,
          {
            headers: createAuthHeaders(),
            cache: 'no-store',
          }
        );
        const ssoData = await ssoResponse.json();
        const hasSSOAccess = ssoResponse.ok && ssoData.success && Array.isArray(ssoData.data);

        return {
          hasAccess: hasOrgAccess && hasSSOAccess,
          error: !hasSSOAccess ? (ssoData.error || 'Identity Center not available') : undefined
        };
      };

      const managementResult = await checkManagement().catch(() => ({ 
        hasAccess: false, 
        error: 'Failed to check management account access' 
      }));

      setCapabilities({
        hasManagementAccess: managementResult.hasAccess,
        hasIAMAccess: true, // IAM always available
        isChecking: false,
        managementError: managementResult.error,
      });
    };

    checkCapabilities();
  }, [awsRegion, ssoRegion]);

  return capabilities;
}
