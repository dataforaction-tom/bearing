'use client'

import { useState, useTransition } from 'react'
import {
  routeAndRun,
  runTrio,
  runChallenger,
  checkAuth,
  requestMagicLink,
  submitRoutedPreference,
} from '@/app/actions'
import type { Factor } from '@/lib/registry'
import { LoadingIndicator } from '@/components/loading-indicator'

// Single entry point for every "actually run my prompt" action (route to the
// top model, Trio, Challenger). Previously these lived in two components —
// RunPanel inline in the top card, TrioPanel after all ~30 model cards — which
// meant Trio/Challenger were effectively invisible below the fold. Folding
// them into one tabbed surface attached to the top card fixes discoverability
// without duplicating the prompt/file/sign-in plumbing three times.

type Mode = 'route' | 'trio' | 'challenger'

const FACTOR_LABELS: Record<Factor, string> = {
  cost: 'cost',
  speed: 'speed',
  quality: 'quality',
  privacy: 'privacy',
  sustainability: 'sustainability',
  transparency: 'transparency',
  capability: 'capability',
}

/** Highest-scoring factor for the routed model — the headline "why". */
function topFactor(factorScores: Record<string, number>): string {
  const entries = Object.entries(factorScores)
  if (entries.length === 0) return 'overall fit'
  const [factor] = entries.reduce((best, cur) => (cur[1] > best[1] ? cur : best))
  return FACTOR_LABELS[factor as Factor] ?? factor
}

interface RouteResult {
  modelName: string
  provider: string
  factorScores: Record<string, number>
  response?: string
  error?: string
  estCost: number
  estCo2g: number | null
  latencyMs: number
}

interface TrioCandidate {
  slug: string
  name: string
  provider: string
  routeRank: number
  role: 'candidate' | 'primary' | 'challenger'
  response?: string
  error?: string
  estCost: number
  estCo2g: number | null
}

interface TrioResult {
  routedRunId: string
  candidates: TrioCandidate[]
  verdict: { winnerSlug: string; winnerName: string; reason: string; judgeModel: string } | null
}

const MODE_LABEL: Record<Mode, string> = {
  route: 'Run top model',
  trio: 'Trio',
  challenger: 'Challenger',
}

const MODE_DESCRIPTION: Record<Mode, string> = {
  route: 'Bearing routes to the highest-ranked model it can actually run for your task and priorities, and runs it for you.',
  trio: 'Bearing sends your prompt to the top 3 ranked models, then a blind judge picks the best answer without knowing which model wrote which.',
  challenger: 'Bearing routes to the top model, then has the #2 model critique and improve its answer. A blind judge picks the stronger result.',
}

const MODE_PLACEHOLDER: Record<Mode, string> = {
  route: 'Enter the prompt you actually want to run...',
  trio: 'Enter the prompt to send to all three models...',
  challenger: 'Enter the prompt to route and challenge...',
}

export function RunSurface({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('route')
  const [prompt, setPrompt] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
  const [trioResult, setTrioResult] = useState<TrioResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [showSignIn, setShowSignIn] = useState(false)
  const [email, setEmail] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  const [preferred, setPreferred] = useState<string | null>(null)

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
    setRouteResult(null)
    setTrioResult(null)
    setError(null)
    setPreferred(null)
  }

  function handlePreference(slug: string) {
    if (!trioResult || preferred) return
    setPreferred(slug)
    startTransition(async () => {
      await submitRoutedPreference(trioResult.routedRunId, slug, null)
    })
  }

  function handleRun() {
    if (!prompt.trim()) return
    setError(null)
    startTransition(async () => {
      const auth = await checkAuth()
      if (!auth.authenticated) {
        setShowSignIn(true)
        return
      }
      const formData = new FormData()
      formData.set('prompt', prompt.trim())
      if (file) formData.set('file', file)

      if (mode === 'route') {
        const res = await routeAndRun(taskId, formData)
        if ('error' in res && res.error && !('modelName' in res)) {
          setError(res.error)
          return
        }
        setRouteResult(res as RouteResult)
      } else {
        const res = mode === 'trio'
          ? await runTrio(taskId, formData)
          : await runChallenger(taskId, formData)
        if ('error' in res && res.error && !('candidates' in res)) {
          setError(res.error)
          return
        }
        setTrioResult(res as TrioResult)
      }
    })
  }

  function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await requestMagicLink(email.trim(), `/recommend/${taskId}/results`)
      if (res.error) setError(res.error)
      else setEmailSent(true)
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-teal px-4 py-2 text-sm font-medium font-display text-teal transition-colors hover:bg-teal hover:text-cream"
      >
        Run this prompt
      </button>
    )
  }

  const hasResult = mode === 'route' ? routeResult !== null : trioResult !== null

  return (
    <div className="mt-4 w-full rounded-lg border border-teal/30 bg-teal/5 p-4 fade-in">
      <div className="mb-3 inline-flex rounded-lg border border-cream-dark bg-white p-0.5">
        {(['route', 'trio', 'challenger'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m ? 'bg-navy text-cream' : 'text-navy/60 hover:text-navy'
            }`}
          >
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <p className="mb-2 font-display text-sm font-semibold text-navy">
        {mode === 'route' ? 'Run your prompt' : MODE_LABEL[mode] + ' mode'}
      </p>
      <p className="mb-3 text-xs text-grey-blue">{MODE_DESCRIPTION[mode]}</p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        disabled={isPending}
        placeholder={MODE_PLACEHOLDER[mode]}
        className="w-full rounded-lg border border-cream-dark bg-white p-3 text-sm text-navy resize-y focus:border-teal focus:ring-1 focus:ring-teal focus:outline-none"
      />

      {/* Optional file attachment (PDF/CSV), same constraints as /compare. */}
      <div className="mt-3">
        {file ? (
          <div className="flex items-center gap-2 rounded-lg border border-teal/30 bg-white px-3 py-2 text-xs">
            <span className="text-navy">{file.name}</span>
            <span className="text-navy/50">({(file.size / 1024).toFixed(0)} KB)</span>
            <button
              type="button"
              onClick={() => { setFile(null); setFileError(null) }}
              className="ml-auto text-coral/70 hover:text-coral"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-cream-dark px-3 py-2 text-xs text-navy/50 transition-colors hover:border-teal hover:text-teal">
            <span>Attach a PDF or CSV (optional, max 5MB)</span>
            <input
              type="file"
              accept=".pdf,.csv"
              className="hidden"
              disabled={isPending}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                setFileError(null)
                if (f.size > 5 * 1024 * 1024) { setFileError('File must be under 5MB.'); return }
                const ext = f.name.split('.').pop()?.toLowerCase()
                if (ext !== 'pdf' && ext !== 'csv') { setFileError('Only PDF or CSV files are supported.'); return }
                setFile(f)
              }}
            />
          </label>
        )}
        {fileError && <p className="mt-1 text-xs text-coral">{fileError}</p>}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-coral">{error}</p>}

      {/* Inline sign-in */}
      {showSignIn && (
        <div className="mt-3 rounded-lg border border-teal/30 bg-white p-3">
          {emailSent ? (
            <p className="text-sm text-teal">Check your email for a sign-in link, then come back and run.</p>
          ) : (
            <form onSubmit={handleSignIn} className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 rounded-md border border-cream-dark bg-cream px-3 py-2 text-sm text-navy focus:border-teal focus:outline-none"
              />
              <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-50">
                {isPending ? 'Sending...' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      )}

      {!showSignIn && (
        <button
          type="button"
          onClick={handleRun}
          disabled={isPending || !prompt.trim()}
          className="mt-3 rounded-lg bg-navy px-4 py-2 text-sm font-semibold font-display text-cream transition-colors hover:bg-navy-light disabled:opacity-40"
        >
          {isPending
            ? (mode === 'route' ? 'Running...' : mode === 'trio' ? 'Running all three...' : 'Routing and challenging...')
            : (mode === 'route' ? 'Route & run' : mode === 'trio' ? 'Run Trio' : 'Run Challenger')}
        </button>
      )}

      {isPending && !hasResult && (
        <div className="mt-4"><LoadingIndicator size="sm" label="Routing and running..." /></div>
      )}

      {mode === 'route' && routeResult && (
        <div className="mt-4 fade-in">
          <div className="mb-2 inline-flex flex-wrap items-center gap-2 rounded-full bg-navy/5 px-3 py-1 text-xs text-navy/70">
            <span>
              Routed to <strong className="text-navy">{routeResult.modelName}</strong> — ranked #1 among runnable models on your priorities
              {' '}(strongest on {topFactor(routeResult.factorScores)})
            </span>
          </div>
          <p className="mb-3 font-mono text-xs text-grey-blue">
            {routeResult.estCo2g != null ? `~${routeResult.estCo2g.toFixed(2)} gCO₂e · ` : ''}
            ~${routeResult.estCost.toFixed(4)}/task · {(routeResult.latencyMs / 1000).toFixed(1)}s
          </p>
          {routeResult.error ? (
            <p className="text-sm text-coral">{routeResult.error}</p>
          ) : (
            <div className="whitespace-pre-wrap rounded-lg border border-cream-dark bg-white p-4 text-sm text-navy">
              {routeResult.response}
            </div>
          )}
        </div>
      )}

      {mode !== 'route' && trioResult && (
        <div className="mt-5 fade-in">
          {trioResult.verdict && (
            <div className="mb-4 rounded-lg border border-coral/30 bg-coral/5 p-4">
              <p className="font-display text-sm font-semibold text-navy">
                Judge&apos;s pick: {trioResult.verdict.winnerName}
              </p>
              <p className="mt-1 text-sm text-navy/70 italic">{trioResult.verdict.reason}</p>
              <p className="mt-1 text-xs text-grey-blue">Judged blind by {trioResult.verdict.judgeModel}</p>
            </div>
          )}

          <div className={`grid gap-3 ${trioResult.candidates.length <= 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {trioResult.candidates.map((c) => {
              const isWinner = trioResult.verdict?.winnerSlug === c.slug
              const roleLabel = c.role === 'primary' ? 'Top pick' : c.role === 'challenger' ? 'Challenger' : `#${c.routeRank}`
              return (
                <div
                  key={c.slug}
                  className={`rounded-lg border p-3 ${isWinner ? 'border-coral border-2 bg-coral/5' : 'border-cream-dark bg-white'}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-display text-sm font-bold text-navy">{c.name}</span>
                    <span className="text-xs text-navy/40">{roleLabel}</span>
                  </div>
                  <p className="mb-2 font-mono text-[11px] text-grey-blue">
                    {c.estCo2g != null ? `~${c.estCo2g.toFixed(2)} gCO₂e · ` : ''}~${c.estCost.toFixed(4)}/task
                  </p>
                  {c.error ? (
                    <p className="text-xs text-coral">{c.error}</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto whitespace-pre-wrap text-xs text-navy">
                      {c.response}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Human preference — the verdict that pairs with the blind judge. */}
          <div className="mt-4 rounded-lg border border-cream-dark bg-cream/50 p-4">
            {preferred ? (
              <p className="text-sm text-teal">
                Thanks — recorded your preference for{' '}
                <strong>
                  {preferred === 'tie'
                    ? 'a tie'
                    : trioResult.candidates.find((c) => c.slug === preferred)?.name ?? preferred}
                </strong>
                . This feeds Bearing&apos;s open preference dataset.
              </p>
            ) : (
              <>
                <p className="mb-2 font-display text-sm font-semibold text-navy">Which answer did you prefer?</p>
                <div className="flex flex-wrap gap-2">
                  {trioResult.candidates.filter((c) => !c.error && c.response?.trim()).map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => handlePreference(c.slug)}
                      disabled={isPending}
                      className="rounded-full border border-navy px-4 py-1.5 text-sm font-medium text-navy transition-colors hover:bg-navy hover:text-cream disabled:opacity-50"
                    >
                      {c.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handlePreference('tie')}
                    disabled={isPending}
                    className="rounded-full border border-cream-dark px-4 py-1.5 text-sm font-medium text-navy/70 transition-colors hover:border-navy disabled:opacity-50"
                  >
                    Tie / no preference
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
