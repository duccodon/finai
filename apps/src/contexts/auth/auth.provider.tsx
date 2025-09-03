// ...existing code...
import { useState, useEffect, type ReactNode } from 'react';
import { AuthContext, type User } from './auth.context';
import * as authService from '@/services/authService';
import { setAccessTokenForHTTP } from '@/lib/http';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  // Khi token đổi, chỉ đẩy vào http qua setter (in-memory)
  useEffect(() => {
    setAccessTokenForHTTP(accessToken);
  }, [accessToken]);

  // try refresh on mount (uses httpOnly cookie)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await authService.refresh();
        console.log('AuthProvider: refresh result', res);
        if (mounted && res.accessToken) {
          setAccessToken(res.accessToken);
          setUser(res.user ?? null);
        }
      } catch (_) {
        // ignore: no valid refresh / not authenticated
      } finally {
        if (mounted) setIsBootstrapping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setAuth = (token: string | null, u?: User) => {
    setAccessToken(token);
    if (u !== undefined) setUser(u ?? null);
  };
  const clearAuth = () => {
    setAccessToken(null);
    setAccessTokenForHTTP(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ accessToken, user, setAuth, clearAuth, isBootstrapping }}
    >
      {children}
    </AuthContext.Provider>
  );
}
