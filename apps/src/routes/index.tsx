import { lazy, Suspense } from 'react';
import { Outlet, Navigate, useRoutes } from 'react-router-dom';
import MainLayout from '@/layouts/mainLayout';

// Lazy load pages
const HomePage = lazy(() => import('@/pages/homepage'));
const AuthPage = lazy(() => import('@/pages/authpage'));
const BacktestHome = lazy(() => import('@/pages/Backtest/BacktestHome'));
const Prediction = lazy(() => import('@/pages/Prediction'));
const BacktestDetail = lazy(() => import('@/pages/Backtest/BacktestDetail'));

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
        { path: 'backtest', element: <BacktestHome /> },
        { path: 'prediction', element: <Prediction /> },
        { path: 'backtest/:id', element: <BacktestDetail /> },
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
// import { createBrowserRouter } from 'react-router-dom';
// import MainLayout from '@/layouts/MainLayout';
// import Home from '@/pages/Home';
// import BacktestHome from '@/pages/Backtest/BacktestHome';
// import Prediction from '@/pages/Prediction';
// const router = createBrowserRouter([
//   {
//     path: '/',
//     element: <MainLayout />,
//     children: [
//       { index: true, element: <Home /> }, // / → Home
//       { path: 'backtest', element: <BacktestHome /> }, // /backtest → Backtest
//       { path: 'prediction', element: <Prediction /> }, // /prediction → Prediction
//     ],
//   },
// ]);

// export default router;
