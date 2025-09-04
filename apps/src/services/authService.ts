import http from '@/lib/http';
import type { AuthResponse, SigninRequest, SignupRequest } from '@/types/auth';

/**
 * POST /api/auth/v1/signin
 * - returns { accessToken, user } and server sets httpOnly refresh cookie
 */
export function signin(body: SigninRequest) {
  return http.post<AuthResponse>('/auth/v1/signin', body);
}

/**
 * POST /api/auth/v1/signup
 * - returns user
 */
export function signup(body: SignupRequest) {
  return http.post<AuthResponse>('/auth/v1/signup', body);
}

/**
 * POST /api/auth/v1/refresh
 * - returns {accessToken + user}
 */
export function refresh() {
  return http.post<AuthResponse>('/auth/v1/refresh', {});
}

/**
 * POST /api/auth/v1/logout
 * - returns {message}
 */
export function logout() {
  return http.post<{ message: string }>(
    '/auth/v1/logout',
    {},
    {
      withCredentials: true,
    }
  );
}

/**
 * POST /api/auth/v1/forgot-password
 * - returns {message}
 */
export function forgotPassword(email: string) {
  console.log(email);
  return http.post<{ message: string }>('/auth/v1/forgot-password', {
    email,
  });
}

/**
 * POST /api/auth/v1/reset-password
 * - returns {message}
 */
export function resetPassword(resetSessionId: string, newPassword: string) {
  return http.post<{ message: string }>('/auth/v1/reset-password', {
    resetSessionId,
    newPassword,
  });
}
