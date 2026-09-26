import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { BoxesIcon, ChevronRightIcon, LogOutIcon, MenuIcon, UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from './AuthProvider'
import { navGroups } from './nav'
import GlobalSearch from '@/features/search/GlobalSearch'
import LowStockBell from '@/features/alerts/LowStockBell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function BrandMark() {
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
      <BoxesIcon className="size-4 text-primary-foreground" />
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {navGroups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const roleLabel = user.role === 'MANAGER' ? 'Manager' : 'Staff'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
        >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
            {initialsOf(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{roleLabel}</span>
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <span className="block truncate text-sm font-medium text-foreground">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            navigate('/profile')
          }}
        >
          <UserIcon className="size-4" />
          My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          <LogOutIcon className="size-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <BrandMark />
        <span className="text-base font-semibold tracking-tight text-foreground">StockSense</span>
      </div>
      <SidebarNav onNavigate={onNavigate} />
      <div className="shrink-0 border-t border-border p-2">
        <ProfileMenu />
      </div>
    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-border bg-sidebar md:block">
        <SidebarBody />
      </aside>

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 md:hidden">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <SidebarBody onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
            <BrandMark />
          </Link>

          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>

          <LowStockBell />
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
