import http from "@/lib/http";
import type { AuthResponse, SigninRequest, SignupRequest } from "@/types/auth";

/**
 * POST /api/auth/v1/signin
 * - returns { accessToken, user } and server sets httpOnly refresh cookie
 */
export function signin(body: SigninRequest) {
    return http.post<AuthResponse>("/auth/v1/signin", body, {
        withCredentials: true,
    });
}

/**
 * POST /api/auth/v1/signup
 * - returns user
 */
export function signup(body: SignupRequest) {
    return http.post<AuthResponse>("/auth/v1/signup", body);
}

/**
 * POST /api/auth/v1/refresh
 * - returns {accessToken + user}
 */
export function refresh() {
    console.log("call to refresh here");
    return http.post<AuthResponse>(
        "/auth/v1/refresh",
        {},
        {
            withCredentials: true,
        }
    );
}
