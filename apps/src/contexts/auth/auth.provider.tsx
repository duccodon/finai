// ...existing code...
import React, { useState, useEffect, type ReactNode } from "react";
import axios from "axios";
import { AuthContext, type User } from "./auth.context";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [user, setUser] = useState<User>(null);

    useEffect(() => {
        if (accessToken)
            axios.defaults.headers.common[
                "Authorization"
            ] = `Bearer ${accessToken}`;
        else delete axios.defaults.headers.common["Authorization"];
    }, [accessToken]);

    const setAuth = (token: string | null, u?: User) => {
        setAccessToken(token);
        if (u !== undefined) setUser(u ?? null);
    };
    const clearAuth = () => {
        setAccessToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ accessToken, user, setAuth, clearAuth }}>
            {children}
        </AuthContext.Provider>
    );
}
