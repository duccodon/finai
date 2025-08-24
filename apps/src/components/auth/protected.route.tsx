import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/auth/auth.helper";

export default function ProtectedRoute() {
    const { accessToken } = useAuth();
    const location = useLocation();

    // If no token -> redirect to auth page
    if (!accessToken) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    // token present -> render nested routes
    return <Outlet />;
}
