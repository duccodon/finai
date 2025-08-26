// ...existing code...
import React, { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import { AuthContext, type User } from "./auth.context";
import * as authService from "@/services/authService";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<User>(null);
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    useEffect(() => {
        if (accessToken)
            axios.defaults.headers.common[
                "Authorization"
            ] = `Bearer ${accessToken}`;
        else delete axios.defaults.headers.common["Authorization"];
    }, [accessToken]);

    // try refresh on mount (uses httpOnly cookie)
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                console.log("call here to refresh after reload page");
                const res = await authService.refresh();
                console.log("res refresh >>>", res);

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
        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{ accessToken, user, setAuth, clearAuth, isBootstrapping }}>
            {children}
        </AuthContext.Provider>
    );
}
