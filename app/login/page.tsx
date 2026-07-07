'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { api, setLoggedBy } from '@/lib/api-client'
import type { LoggedBy } from '@/lib/types'

const LOGGED_BY_OPTIONS: { value: LoggedBy; label: string }[] = [
  { value: 'AYAH', label: 'Ayah' },
  { value: 'IBU', label: 'Ibu' },
  { value: 'PENGASUH', label: 'Pengasuh' },
]

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pin, setPin] = useState('')
  const [loggedBy, setLoggedByState] = useState<LoggedBy>('IBU')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.login(pin, loggedBy)
      setLoggedBy(loggedBy)
      const from = searchParams.get('from') || '/'
      router.push(from)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg"
      >
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">👶</div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Baby Tracker
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter PIN to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="logged-by"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              Logged by
            </label>
            <select
              id="logged-by"
              value={loggedBy}
              onChange={(e) => setLoggedByState(e.target.value as LoggedBy)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground"
            >
              {LOGGED_BY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="pin"
              className="mb-1 block text-sm font-medium text-foreground"
            >
              PIN
            </label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full rounded-xl border border-input bg-background px-3 py-3 text-center text-2xl tracking-[0.5em] text-foreground"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full rounded-xl bg-primary px-4 py-3 font-heading font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {loading ? '...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
