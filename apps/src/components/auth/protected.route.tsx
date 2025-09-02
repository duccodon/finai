import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth/auth.helper';

export default function ProtectedRoute() {
  const { accessToken, isBootstrapping } = useAuth();
  const location = useLocation();

  // while we try refresh, show nothing or a loader to avoid instant redirect
  if (isBootstrapping) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // If no token -> redirect to auth page
  if (!accessToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // token present -> render nested routes
  return <Outlet />;
}
