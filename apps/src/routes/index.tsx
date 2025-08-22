import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/mainLayout';

// Lazy load pages
const HomePage = lazy(() => import('@/pages/homepage'));
const AuthPage = lazy(() => import('@/pages/authpage'));

const LoadingSpinner = () => (
    <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
);

export default function Router() {
    return useRoutes([
        {
            path: '/',
            element: (
                <MainLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                        <Outlet />
                    </Suspense>
                </MainLayout>
            ),
            children: [
                { element: <HomePage />, index: true },
            ],
        },
        {
            path: 'auth',
            element: (
                <Suspense fallback={<LoadingSpinner />}>
                    <AuthPage />
                </Suspense>
            ),
        },
        {
            path: '404',
            element: (
                <div className="flex items-center justify-center min-h-screen">
                    <h1 className="text-2xl font-bold">404 - Page Not Found</h1>
                </div>
            ),
        },
        {
            path: '*',
            element: <Navigate to="/404" replace />,
        },
    ]);
}