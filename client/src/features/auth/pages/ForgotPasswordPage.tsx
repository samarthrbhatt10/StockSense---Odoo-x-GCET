import { useEffect, useState } from "react"
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowLeftIcon, CircleCheckIcon, LoaderCircleIcon, SendIcon } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '../components/PasswordInput'
import { PasswordRules } from '../components/PasswordRules'
import { AuthCardHeader, FormAlert, StepIndicator } from '../components/StepIndicator'
import {
  forgotPasswordSchema,
  newPasswordSchema,
  otpSchema,
  type ForgotPasswordValues,
  type NewPasswordValues,
  type OtpValues,
} from '../schemas'
import { messageOf } from '../errors'

const STEPS = ["Email", "Code", "Password"] as const
const RESEND_SECONDS = 30
const NETWORK_FALLBACK = 'Cannot reach the server. Is it running?'

type MessageResponse = { message: string }
type ValidResponse = { valid: true }

type Step = 1 | 2 | 3 | 4

export default function ForgotPasswordPage() {
  const navigate = useNavigate()

  // Every step keeps its value here, so going back and forth never loses input.
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const emailForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  })

  const passwordForm = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (step === 2) otpForm.setFocus('otp')
  }, [step, otpForm])

  const sendCode = useMutation({
    mutationFn: (address: string) => api.post<MessageResponse>('/auth/forgot-password', { email: address }),
    onSuccess: () => {
      setCooldown(RESEND_SECONDS)
      setStep(2)
    },
  })

  const resend = useMutation({
    mutationFn: (address: string) => api.post<MessageResponse>('/auth/forgot-password', { email: address }),
    onSuccess: () => {
      setCooldown(RESEND_SECONDS)
      setOtp('')
      otpForm.reset({ otp: '' })
      toast.success('A new code has been sent.')
    },
    onError: (err) => setError(messageOf(err, NETWORK_FALLBACK)),
  })

  const verify = useMutation({
    mutationFn: (code: string) => api.post<ValidResponse>('/auth/verify-otp', { email, otp: code }),
    onSuccess: (_data, code) => {
      setOtp(code)
      setError(null)
      setStep(3)
    },
    onError: (err) => setError(messageOf(err, 'That code is not valid.')),
  })

  const reset = useMutation({
    mutationFn: (values: NewPasswordValues) =>
      api.post<MessageResponse>('/auth/reset-password', {
        email,
        otp,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      setError(null)
      setStep(4)
    },
    onError: (err) => setError(messageOf(err, 'That code is not valid.')),
  })

  const submitEmail = (values: ForgotPasswordValues): void => {
    setError(null)
    sendCode.mutate(values.email, {
      onSuccess: () => setEmail(values.email),
    })
  }

  const submitOtp = (values: OtpValues): void => {
    setError(null)
    verify.mutate(values.otp)
  }

  const submitPassword = (values: NewPasswordValues): void => {
    setError(null)
    reset.mutate(values)
  }

  const startOver = (): void => {
    setStep(1)
    setError(null)
    setOtp('')
    otpForm.reset({ otp: '' })
  }

  const isPending =
    sendCode.isPending || resend.isPending || verify.isPending || reset.isPending

  return (
    <div className="space-y-6">
      {step === 4 ? (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CircleCheckIcon className="size-6" />
            </span>
            <div className="space-y-1">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Password updated</h1>
              <p className="text-sm text-muted-foreground">
                Your new password is ready. You can log in with it now.
              </p>
            </div>
          </div>
          <Button asChild className="w-full">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <AuthCardHeader title="Reset your password" description="We will email you a 6-digit code." />

          <StepIndicator steps={STEPS} current={step} />

          {step === 1 ? (
            <form onSubmit={emailForm.handleSubmit(submitEmail)} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@stocksense.local"
                  aria-invalid={Boolean(emailForm.formState.errors.email)}
                  {...emailForm.register('email')}
                />
                {emailForm.formState.errors.email ? (
                  <p className="text-sm text-destructive">
                    {emailForm.formState.errors.email.message}
                  </p>
                ) : null}
              </div>

              {error ? <FormAlert>{error}</FormAlert> : null}

              <Button type="submit" className="w-full" disabled={isPending}>
                {sendCode.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Send code
              </Button>
            </form>
          ) : null}

          {step === 2 ? (
            <form onSubmit={otpForm.handleSubmit(submitOtp)} noValidate className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the code sent to <span className="font-medium text-foreground">{email}</span>.
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="otp">6-digit code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center font-mono text-lg tracking-[0.4em]"
                  aria-invalid={Boolean(otpForm.formState.errors.otp)}
                  {...otpForm.register('otp')}
                />
                {otpForm.formState.errors.otp ? (
                  <p className="text-sm text-destructive">{otpForm.formState.errors.otp.message}</p>
                ) : null}
              </div>

              {error ? <FormAlert>{error}</FormAlert> : null}

              <Button type="submit" className="w-full" disabled={isPending}>
                {verify.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Verify code
              </Button>

              <div className="flex items-center justify-between gap-2 text-sm">
                <button
                  type="button"
                  onClick={startOver}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  Use a different email
                </button>
                <button
                  type="button"
                  onClick={() => resend.mutate(email)}
                  disabled={cooldown > 0 || resend.isPending}
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline disabled:pointer-events-none disabled:text-muted-foreground disabled:no-underline"
                >
                  {resend.isPending ? (
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                  ) : (
                    <SendIcon className="size-3.5" />
                  )}
                  {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
                </button>
              </div>

              {import.meta.env.DEV ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Email not configured? The code is printed in the server console.
                </p>
              ) : null}
            </form>
          ) : null}

          {step === 3 ? (
            <form
              onSubmit={passwordForm.handleSubmit(submitPassword)}
              noValidate
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <PasswordInput
                  id="newPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(passwordForm.formState.errors.newPassword)}
                  {...passwordForm.register('newPassword')}
                />
                {passwordForm.formState.errors.newPassword ? (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                ) : null}
                <PasswordRules value={passwordForm.watch('newPassword') ?? ''} className="pt-1" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <PasswordInput
                  id="confirmPassword"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(passwordForm.formState.errors.confirmPassword)}
                  {...passwordForm.register('confirmPassword')}
                />
                {passwordForm.formState.errors.confirmPassword ? (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>

              {error ? <FormAlert>{error}</FormAlert> : null}

              <Button type="submit" className="w-full" disabled={isPending}>
                {reset.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
                Update password
              </Button>

              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setStep(2)
                }}
                className="inline-flex w-full items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                <ArrowLeftIcon className="size-3.5" />
                Back to code
              </button>
            </form>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Remembered it?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-medium text-primary hover:underline"
            >
              Back to sign in
            </button>
          </p>
        </>
      )}
    </div>
  )
}
