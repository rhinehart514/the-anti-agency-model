'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import type {
  SiteUser,
  SiteRole,
  SiteSession,
  SiteAuthContext,
  LoginCredentials,
  SignupCredentials,
  Permission,
} from './types';

const AuthContext = createContext<SiteAuthContext | null>(null);

interface SiteAuthProviderProps {
  siteId: string;
  children: ReactNode;
}

export function SiteAuthProvider({ siteId, children }: SiteAuthProviderProps) {
  const [user, setUser] = useState<SiteUser | null>(null);
  const [session, setSession] = useState<SiteSession | null>(null);
  const [roles, setRoles] = useState<SiteRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Extract permissions from roles
  const permissions = roles.flatMap((r) => r.permissions) as Permission[];

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, [siteId]);

  const checkSession = async () => {
    try {
      const token = getStoredToken(siteId);
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/sites/${siteId}/auth/session`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSession(data.session);
        setRoles(data.roles || []);
      } else {
        // Invalid session, clear token
        clearStoredToken(siteId);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const response = await fetch(`/api/sites/${siteId}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      setSession(data.session);
      setRoles(data.roles || []);
      storeToken(siteId, data.session.token);
    },
    [siteId]
  );

  const signup = useCallback(
    async (credentials: SignupCredentials) => {
      const response = await fetch(`/api/sites/${siteId}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
      }

      const data = await response.json();
      setUser(data.user);
      setSession(data.session);
      setRoles(data.roles || []);
      storeToken(siteId, data.session.token);
    },
    [siteId]
  );

  const logout = useCallback(async () => {
    try {
      const token = getStoredToken(siteId);
      if (token) {
        await fetch(`/api/sites/${siteId}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } finally {
      setUser(null);
      setSession(null);
      setRoles([]);
      clearStoredToken(siteId);
    }
  }, [siteId]);

  const hasPermission = useCallback(
    (permission: Permission) => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasRole = useCallback(
    (roleName: string) => {
      return roles.some((r) => r.name === roleName);
    },
    [roles]
  );

  const value: SiteAuthContext = {
    user,
    session,
    roles,
    permissions,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSiteAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSiteAuth must be used within a SiteAuthProvider');
  }
  return context;
}

// Token storage helpers
const TOKEN_KEY = 'site_auth_token_';

function storeToken(siteId: string, token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY + siteId, token);
  }
}

function getStoredToken(siteId: string): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY + siteId);
  }
  return null;
}

function clearStoredToken(siteId: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY + siteId);
  }
}
