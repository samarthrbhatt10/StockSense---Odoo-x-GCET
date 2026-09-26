import { createBrowserRouter, Navigate } from 'react-router'
import AppLayout from './AppLayout'
import AuthLayout from './AuthLayout'
import NotFoundPage from './NotFoundPage'
import ProtectedRoute from './ProtectedRoute'
import PublicOnlyRoute from './PublicOnlyRoute'

import LoginPage from '@/features/auth/pages/LoginPage'
import SignupPage from '@/features/auth/pages/SignupPage'
import ForgotPasswordPage from '@/features/auth/pages/ForgotPasswordPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import ProductListPage from '@/features/products/pages/ProductListPage'
import ProductFormPage from '@/features/products/pages/ProductFormPage'
import CategoriesPage from '@/features/products/pages/CategoriesPage'
import ProductDetailPage from '@/features/products/pages/ProductDetailPage'
import OperationListPage from '@/features/operations/pages/OperationListPage'
import OperationFormPage from '@/features/operations/pages/OperationFormPage'
import OperationDetailPage from '@/features/operations/pages/OperationDetailPage'
import MoveHistoryPage from '@/features/moves/pages/MoveHistoryPage'
import LowStockPage from '@/features/alerts/pages/LowStockPage'
import WarehousesPage from '@/features/settings/pages/WarehousesPage'
import LocationsPage from '@/features/settings/pages/LocationsPage'
import ProfilePage from '@/features/profile/pages/ProfilePage'

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/products', element: <ProductListPage /> },
          { path: '/products/new', element: <ProductFormPage /> },
          { path: '/products/categories', element: <CategoriesPage /> },
          { path: '/products/:id', element: <ProductDetailPage /> },
          { path: '/products/:id/edit', element: <ProductFormPage /> },
          { path: '/operations/:kind', element: <OperationListPage /> },
          { path: '/operations/:kind/new', element: <OperationFormPage /> },
          { path: '/operations/:kind/:id', element: <OperationDetailPage /> },
          { path: '/operations/:kind/:id/edit', element: <OperationFormPage /> },
          { path: '/moves', element: <MoveHistoryPage /> },
          { path: '/alerts', element: <LowStockPage /> },
          { path: '/settings/warehouses', element: <WarehousesPage /> },
          { path: '/settings/locations', element: <LocationsPage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
