import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api, tokenStorage } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import type { User } from '@/lib/types'

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  isManager: boolean
  login: (token: string, user: User) => void
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const logout = useCallback(() => {
    tokenStorage.clear()
    setUser(null)
    queryClient.clear()
  }, [])

  const login = useCallback((token: string, nextUser: User) => {
    tokenStorage.set(token)
    setUser(nextUser)
    queryClient.clear()
  }, [])

  const refreshUser = useCallback(async () => {
    if (!tokenStorage.get()) {
      setUser(null)
      setIsLoading(false)
      return
    }
    try {
      const me = await api.get<User>('/auth/me')
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    const handleLogout = () => logout()
    window.addEventListener('auth:logout', handleLogout)
    return () => window.removeEventListener('auth:logout', handleLogout)
  }, [logout])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isManager: user?.role === 'MANAGER',
      login,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
