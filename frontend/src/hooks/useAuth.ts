/**
 * useAuth Hook - Authentication logic
 */
'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api';
import { parseApiError } from '@/lib/utils';

export function useAuth() {
  const router = useRouter();
  const {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    logout: storeLogout,
    setUser,
    setLoading,
  } = useAuthStore();

  // Check authentication status on mount - only if we have a token
  useEffect(() => {
    const checkAuth = async () => {
      // Only try to fetch user data if we have an access token but no user data
      if (accessToken && !user) {
        try {
          const userData = await authApi.getMe();
          setUser(userData);
        } catch {
          // Token is invalid, clear it
          storeLogout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [accessToken, user, setUser, storeLogout, setLoading]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const tokens = await authApi.login(email, password);
        // Store tokens first, then fetch user data with the new token
        useAuthStore.getState().setTokens(tokens.access_token, tokens.refresh_token);
        const userData = await authApi.getMe();
        storeLogin(userData, tokens.access_token, tokens.refresh_token);
        router.push('/documents');
        return { success: true };
      } catch (error) {
        return { success: false, error: parseApiError(error) };
      }
    },
    [storeLogin, router]
  );

  const register = useCallback(
    async (email: string, password: string, fullName?: string) => {
      try {
        await authApi.register(email, password, fullName);
        // Auto-login after registration
        return await login(email, password);
      } catch (error) {
        return { success: false, error: parseApiError(error) };
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      storeLogout();
      router.push('/login');
    }
  }, [storeLogout, router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
