import { useState } from "react"
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { LoaderCircleIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useAuth } from '@/app/AuthProvider'
import type { User } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRules } from '../components/PasswordRules'
import { AuthCardHeader, FormAlert } from '../components/StepIndicator'
import { ROLE_OPTIONS, signupSchema, type SignupValues } from '../schemas'
import { isConflict, messageOf } from '../errors'

type SignupResponse = { token: string; user: User }

const NETWORK_FALLBACK = 'Cannot reach the server. Is it running?'

export default function SignupPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'STAFF' },
  })

  const password = watch('password') ?? ''
  const role = watch('role')

  const { mutate: submit, isPending } = useMutation({
    mutationFn: (values: SignupValues) =>
      api.post<SignupResponse>('/auth/signup', {
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
      }),
    onSuccess: (result) => {
      login(result.token, result.user)
      toast.success(`Welcome to StockSense, ${result.user.name.split(' ')[0]}.`)
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const message = messageOf(error, NETWORK_FALLBACK)
      setFormError(message)
      toast.error(message)
      // A duplicate email belongs on the email field, not only in a generic banner.
      if (isConflict(error)) setError('email', { type: 'server', message })
    },
  })

  const onSubmit = (values: SignupValues): void => {
    setFormError(null)
    submit(values)
  }

  return (
    <div className="space-y-6">
      <AuthCardHeader
        title="Create your account"
        description="Set up a StockSense account to start managing stock."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Manager"
            aria-invalid={Boolean(errors.name)}
            {...register('name')}
          />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

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
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select
            value={role}
            onValueChange={(value) =>
              setValue('role', value as SignupValues['role'], { shouldValidate: true })
            }
          >
            <SelectTrigger id="role" className="w-full" aria-invalid={Boolean(errors.role)}>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role ? <p className="text-sm text-destructive">{errors.role.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : null}
          <PasswordRules value={password} className="pt-1" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
          ) : null}
        </div>

        {formError ? <FormAlert>{formError}</FormAlert> : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
