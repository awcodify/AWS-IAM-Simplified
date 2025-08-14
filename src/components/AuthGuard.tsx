/**
 * Authentication guard component to protect routes
 */
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
}

export default function AuthGuard({ 
  children, 
  redirectTo = '/auth/login',
  requireAuth = true 
}: AuthGuardProps) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      const isAuthenticated = session?.isAuthenticated || false;
      
      if (requireAuth && !isAuthenticated) {
        router.push(redirectTo);
      } else if (!requireAuth && isAuthenticated) {
        // If on auth page but already authenticated, redirect to dashboard
        router.push('/');
      }
    }
  }, [session, loading, requireAuth, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  const isAuthenticated = session?.isAuthenticated || false;

  // Don't render children if auth requirement doesn't match
  if (requireAuth && !isAuthenticated) {
    return null; // Will redirect
  }

  if (!requireAuth && isAuthenticated) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
