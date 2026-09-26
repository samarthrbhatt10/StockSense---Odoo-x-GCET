import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'
import { LoaderCircleIcon } from 'lucide-react'

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!user) {
    const from = `${location.pathname}${location.search}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  return <Outlet />
}
