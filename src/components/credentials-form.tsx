'use client'

import { useState, useTransition } from 'react'

interface CredentialsFormProps {
  /** Called with (email, password) once client-side validation passes.
   *  Return `{ error }` to show an inline error, or `{}`/nothing on success. */
  onSubmit: (email: string, password: string) => Promise<{ error?: string } | void>
  /** Called after a successful onSubmit (no error returned). */
  onSuccess?: () => void
  /** Register mode adds a "confirm password" field and checks they match
   *  client-side before calling onSubmit. */
  confirmPassword?: boolean
  submitLabel: string
  pendingLabel: string
  className?: string
}

/**
 * Shared email+password form used by the dedicated sign-in page, the
 * registration page, and both inline sign-in embeds (Trio/Route run panel,
 * direct compare) — one place for this logic instead of three-plus copies.
 */
export function CredentialsForm({
  onSubmit,
  onSuccess,
  confirmPassword = false,
  submitLabel,
  pendingLabel,
  className,
}: CredentialsFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (confirmPassword && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const result = await onSubmit(email.trim(), password)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess?.()
    })
  }

  return (
    <form onSubmit={handleSubmit} className={className ?? 'space-y-3'}>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        disabled={isPending}
        className="w-full rounded-md border border-cream-dark bg-cream px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-teal focus:ring-2 focus:ring-teal/30 focus:outline-none"
      />
      <input
        type="password"
        required
        autoComplete={confirmPassword ? 'new-password' : 'current-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={isPending}
        className="w-full rounded-md border border-cream-dark bg-cream px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-teal focus:ring-2 focus:ring-teal/30 focus:outline-none"
      />
      {confirmPassword && (
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm password"
          disabled={isPending}
          className="w-full rounded-md border border-cream-dark bg-cream px-3 py-2 text-sm text-navy placeholder:text-navy/40 focus:border-teal focus:ring-2 focus:ring-teal/30 focus:outline-none"
        />
      )}

      {error && <p role="alert" className="text-sm text-coral">{error}</p>}

      <button type="submit" disabled={isPending} className="btn-primary w-full text-sm disabled:opacity-50">
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  )
}
