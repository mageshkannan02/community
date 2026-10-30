'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';
import {
  getStoredUser,
  setStoredUser,
  getStoredToken,
  setStoredToken,
  clearStoredTokens,
  loginUser,
  registerUser,
  checkBackendHealth,
} from './api';
import { DEMO_ROLES } from './demo-data';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendLive: boolean;
  login: (email: string, pass: string, role?: 'Admin' | 'Member') => Promise<{ success: boolean; message?: string }>;
  register: (data: { full_name: string; email: string; password: string; role_name?: 'Admin' | 'Member'; bio?: string }) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchDemoUser: (user: User) => void;
  updateCurrentUserRole: (newRole: 'Admin' | 'Member') => void;
  refreshHealth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isBackendLive: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: () => {},
  switchDemoUser: () => {},
  updateCurrentUserRole: () => {},
  refreshHealth: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendLive, setIsBackendLive] = useState(false);

  const refreshHealth = async () => {
    const live = await checkBackendHealth();
    setIsBackendLive(live);
  };

  useEffect(() => {
    // Check saved user session
    const stored = getStoredUser();
    const token = getStoredToken();
    if (stored && token) {
      setUser(stored);
    } else {
      // Unauthenticated by default: require explicit login
      clearStoredTokens();
      setUser(null);
    }
    setIsLoading(false);

    // Initial backend check
    refreshHealth();
  }, []);

  const login = async (email: string, pass: string, role?: 'Admin' | 'Member') => {
    try {
      const res = await loginUser(email, pass, role);
      if (res.user) {
        setUser(res.user);
        setIsBackendLive(res.isLive);
        return { success: true };
      }
      return { success: false, message: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Login error' };
    }
  };

  const register = async (data: { full_name: string; email: string; password: string; role_name?: 'Admin' | 'Member'; bio?: string }) => {
    try {
      const res = await registerUser(data);
      if (res.user) {
        setUser(res.user);
        setIsBackendLive(res.isLive);
        return { success: true };
      }
      return { success: false, message: res.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Registration error' };
    }
  };

  const logout = () => {
    clearStoredTokens();
    setUser(null);
  };

  const switchDemoUser = (newUser: User) => {
    setUser(newUser);
    setStoredUser(newUser);
    setStoredToken('mock-jwt-token-' + newUser.id);
  };

  const updateCurrentUserRole = (newRole: 'Admin' | 'Member') => {
    if (!user) return;
    const roleObj =
      newRole === 'Admin'
        ? DEMO_ROLES.find((r) => r.name === 'Admin') || DEMO_ROLES[1]
        : DEMO_ROLES[0];

    const updatedUser: User = {
      ...user,
      role_id: roleObj.id,
      role: roleObj,
    };
    setUser(updatedUser);
    setStoredUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isBackendLive,
        login,
        register,
        logout,
        switchDemoUser,
        updateCurrentUserRole,
        refreshHealth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
