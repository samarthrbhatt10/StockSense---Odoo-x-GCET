import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthProvider'
import { LoaderCircleIcon } from 'lucide-react'

export default function PublicOnlyRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
