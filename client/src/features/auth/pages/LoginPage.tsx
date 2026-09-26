import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LoaderCircleIcon } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { emailSchema } from '@/lib/validation'
import { useAuth } from '@/app/AuthProvider'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginResponse = { token: string; user: User }

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

type LoginValues = z.infer<typeof loginSchema>

type LocationState = { from?: string } | null

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginValues): Promise<void> => {
    setFormError(null)
    try {
      const result = await api.post<LoginResponse>('/auth/login', {
        email: values.email,
        password: values.password,
      })
      login(result.token, result.user)
      const from = (location.state as LocationState)?.from
      navigate(from && from !== '/login' ? from : '/dashboard', { replace: true })
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : 'Cannot reach the server. Is it running?',
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in</h1>
        <p className="text-sm text-muted-foreground">Use your StockSense account to continue.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@stocksense.local"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <LoaderCircleIcon className="animate-spin" /> : null}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="space-y-2 text-sm text-muted-foreground">
        <p>
          No account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
        <p>
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Forgot your password?
          </Link>
        </p>
      </div>

      {import.meta.env.DEV ? (
        <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          Demo login: <span className="font-medium text-foreground">manager@stocksense.local</span> /{' '}
          <span className="font-medium text-foreground">Manager@123</span>
        </p>
      ) : null}
    </div>
  )
}
