/**
 * Authentication context for managing global auth state
 */
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthenticationState, SessionInfo } from '@/types/auth';
import { AuthService } from '@/lib/auth-service';

interface AuthContextType extends AuthenticationState {
  login: (method: 'access-keys' | 'profile', data: any) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthenticationState>({
    session: null,
    loading: true,
    error: null
  });

  // Initialize session on mount
  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const session = await AuthService.refreshSession();
      setState({
        session,
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        session: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize session'
      });
    }
  };

  const login = async (method: 'access-keys' | 'profile', data: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let session: SessionInfo;

      if (method === 'access-keys') {
        session = await AuthService.authenticateWithAccessKeys(data);
      } else if (method === 'profile') {
        session = await AuthService.authenticateWithProfile(data);
      } else {
        throw new Error('Unsupported authentication method');
      }

      setState({
        session,
        loading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }));
      throw error;
    }
  };

  const logout = () => {
    AuthService.clearSession();
    setState({
      session: null,
      loading: false,
      error: null
    });
  };

  const refreshSession = async () => {
    try {
      const session = await AuthService.refreshSession();
      setState(prev => ({
        ...prev,
        session,
        error: null
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        session: null,
        error: error instanceof Error ? error.message : 'Session refresh failed'
      }));
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
