import { useEffect } from "react"
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { KeyRoundIcon, LoaderCircleIcon, ShieldCheckIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/app/AuthProvider'
import { formatDate } from '@/lib/format'
import type { User } from '@/lib/types'
import { PageHeader } from '@/components/common'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/features/auth/components/PasswordInput'
import { PasswordRules } from '@/features/auth/components/PasswordRules'
import { ROLE_LABELS } from '@/features/auth/schemas'
import { fieldErrorsOf, messageOf } from '@/features/auth/errors'
import { changePasswordSchema, profileSchema, type ChangePasswordValues, type ProfileValues } from '../schemas'

const NETWORK_FALLBACK = 'Cannot reach the server. Is it running?'

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '' },
  })

  // The sidebar shows this name, so the form always mirrors the live user.
  useEffect(() => {
    if (!user) return
    profileForm.reset({ name: user.name, email: user.email })
  }, [user, profileForm])

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const updateProfile = useMutation({
    mutationFn: (values: ProfileValues) =>
      api.patch<User>('/auth/me', { name: values.name, email: values.email }),
    onSuccess: async (updated) => {
      await refreshUser()
      profileForm.reset({ name: updated.name, email: updated.email })
      toast.success('Profile updated.')
    },
    onError: (error) => {
      toast.error(messageOf(error, NETWORK_FALLBACK))
    },
  })

  const changePassword = useMutation({
    mutationFn: (values: ChangePasswordValues) =>
      api.post<{ message: string }>('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Password changed.')
    },
    onError: (error) => {
      // The server answers a wrong current password with a field error, so it
      // belongs under that input rather than only in a toast.
      const currentPasswordError = fieldErrorsOf(error, 'currentPassword')
      if (currentPasswordError) {
        passwordForm.setError('currentPassword', { type: 'server', message: currentPasswordError })
      }
      const newPasswordError = fieldErrorsOf(error, 'newPassword')
      if (newPasswordError) {
        passwordForm.setError('newPassword', { type: 'server', message: newPasswordError })
      }
      toast.error(messageOf(error, NETWORK_FALLBACK))
    },
  })

  if (!user) return null

  const roleLabel = ROLE_LABELS[user.role] ?? user.role
  const profileErrors = profileForm.formState.errors
  const passwordErrors = passwordForm.formState.errors

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your account details and password."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your role is managed by an administrator.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">
                <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">
                  {initialsOf(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-medium text-foreground">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Role
              </p>
              <div>
                <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-3.5" />
                  {roleLabel}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Member since
              </p>
              <p className="text-sm text-foreground">{formatDate(user.createdAt)}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>Update the name and email shown across StockSense.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={profileForm.handleSubmit((values) => updateProfile.mutate(values))}
                noValidate
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    autoComplete="name"
                    aria-invalid={Boolean(profileErrors.name)}
                    {...profileForm.register('name')}
                  />
                  {profileErrors.name ? (
                    <p className="text-sm text-destructive">{profileErrors.name.message}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(profileErrors.email)}
                    {...profileForm.register('email')}
                  />
                  {profileErrors.email ? (
                    <p className="text-sm text-destructive">{profileErrors.email.message}</p>
                  ) : null}
                </div>

                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Choose a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={passwordForm.handleSubmit((values) => changePassword.mutate(values))}
                noValidate
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <Label htmlFor="currentPassword">Current password</Label>
                  <PasswordInput
                    id="currentPassword"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(passwordErrors.currentPassword)}
                    {...passwordForm.register('currentPassword')}
                  />
                  {passwordErrors.currentPassword ? (
                    <p className="text-sm text-destructive">
                      {passwordErrors.currentPassword.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New password</Label>
                  <PasswordInput
                    id="newPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(passwordErrors.newPassword)}
                    {...passwordForm.register('newPassword')}
                  />
                  {passwordErrors.newPassword ? (
                    <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>
                  ) : null}
                  <PasswordRules
                    value={passwordForm.watch('newPassword') ?? ''}
                    className="pt-1"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(passwordErrors.confirmPassword)}
                    {...passwordForm.register('confirmPassword')}
                  />
                  {passwordErrors.confirmPassword ? (
                    <p className="text-sm text-destructive">
                      {passwordErrors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" disabled={changePassword.isPending}>
                  {changePassword.isPending ? (
                    <LoaderCircleIcon className="animate-spin" />
                  ) : (
                    <KeyRoundIcon />
                  )}
                  Change password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
