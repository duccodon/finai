import { createContext } from "react";

export type User = Record<string, unknown> | null;

export type AuthContextType = {
    accessToken: string | null;
    user: User;
    setAuth: (token: string | null, user?: User) => void;
    clearAuth: () => void;
    isBootstrapping: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(
    undefined
);
