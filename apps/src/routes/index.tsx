import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Home from '@/pages/Home';
import BacktestHome from '@/pages/Backtest/BacktestHome';
import Prediction from '@/pages/Prediction';
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Home /> }, // / → Home
      { path: 'backtest', element: <BacktestHome /> }, // /backtest → Backtest
      { path: 'prediction', element: <Prediction /> }, // /prediction → Prediction
    ],
  },
]);

export default router;
