import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Zap, TriangleAlert as AlertTriangle, ChevronDown, Loader as Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { AUDIT_TYPES, INDUSTRIES } from '../types'

export default function AuditPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const defaultType = searchParams.get('type') || 'audit'
  const [auditType, setAuditType] = useState(defaultType)
  const [industry, setIndustry] = useState('')
  const [landingUrl, setLandingUrl] = useState('')
  const [competitorName, setCompetitorName] = useState('')
  const [brandUrl, setBrandUrl] = useState('')
  const [adContext, setAdContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasClaudeKey, setHasClaudeKey] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('api_keys')
      .select('service')
      .eq('user_id', user.id)
      .eq('service', 'claude')
      .maybeSingle()
      .then(({ data }) => setHasClaudeKey(!!data))
  }, [user])

  const selectedType = AUDIT_TYPES.find(t => t.id === auditType) || AUDIT_TYPES[0]
  const needsLanding = auditType === 'landing'
  const needsCompetitor = auditType === 'competitor'
  const needsDNA = auditType === 'dna'
  const needsIndustry = auditType === 'plan' || auditType === 'audit'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError('')
    setLoading(true)

    const { data: run, error: runError } = await supabase
      .from('audit_runs')
      .insert({
        user_id: user.id,
        audit_type: auditType,
        platform: selectedType.platform,
        industry,
        landing_url: landingUrl,
        competitor_name: competitorName,
        brand_url: brandUrl,
        status: 'pending',
      })
      .select()
      .single()

    if (runError || !run) {
      setError(runError?.message || 'Failed to create audit run')
      setLoading(false)
      return
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/run-audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || anonKey}`,
          Apikey: anonKey,
        },
        body: JSON.stringify({
          run_id: run.id,
          audit_type: auditType,
          platform: selectedType.platform,
          industry,
          landing_url: landingUrl,
          competitor_name: competitorName,
          brand_url: brandUrl,
          ad_context: adContext,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        setError(err.error || 'Failed to start audit')
        setLoading(false)
        return
      }
    } catch {
      setError('Failed to reach audit service. Please try again.')
      setLoading(false)
      return
    }

    setLoading(false)
    navigate(`/results/${run.id}`)
  }

  return (
    <div className="max-w-2xl space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Run Audit</h1>
        <p className="text-slate-400 text-sm mt-1">Configure and launch an AI-powered advertising analysis</p>
      </div>

      {hasClaudeKey === false && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Claude API key not configured</p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              Add your Claude API key in{' '}
              <a href="/integrations" className="underline hover:text-amber-300">Integrations</a>{' '}
              before running an audit.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-5 space-y-5">
          <h2 className="section-title">Audit type</h2>

          <div className="grid grid-cols-2 gap-2">
            {AUDIT_TYPES.map(type => (
              <button
                key={type.id}
                type="button"
                onClick={() => setAuditType(type.id)}
                className={`text-left p-3 rounded-lg border transition-all duration-150 ${
                  auditType === type.id
                    ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                    : 'border-[#1e2d45] hover:border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-sm font-medium">{type.label}</div>
                <div className="text-xs opacity-70 mt-0.5 leading-tight">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="section-title">Configuration</h2>

          {needsIndustry && (
            <div>
              <label className="label">Industry <span className="text-slate-500">(optional)</span></label>
              <div className="relative">
                <select
                  value={industry}
                  onChange={e => setIndustry(e.target.value)}
                  className="input appearance-none pr-8"
                >
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(ind => (
                    <option key={ind.id} value={ind.id}>{ind.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
          )}

          {needsLanding && (
            <div>
              <label className="label">Landing page URL <span className="text-red-400">*</span></label>
              <input
                type="url"
                value={landingUrl}
                onChange={e => setLandingUrl(e.target.value)}
                placeholder="https://yoursite.com/landing"
                className="input"
                required
              />
            </div>
          )}

          {needsCompetitor && (
            <div>
              <label className="label">Competitor name or URL <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={competitorName}
                onChange={e => setCompetitorName(e.target.value)}
                placeholder="Competitor name or website URL"
                className="input"
                required
              />
            </div>
          )}

          {needsDNA && (
            <div>
              <label className="label">Brand website URL <span className="text-red-400">*</span></label>
              <input
                type="url"
                value={brandUrl}
                onChange={e => setBrandUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="input"
                required
              />
            </div>
          )}

          <div>
            <label className="label">
              Additional context <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={adContext}
              onChange={e => setAdContext(e.target.value)}
              placeholder={`Describe your business, target audience, goals, current challenges, budget range, or anything that will help the AI give better recommendations...`}
              className="input min-h-[120px] resize-none"
              rows={5}
            />
            <p className="text-xs text-slate-500 mt-1">
              The more context you provide, the more specific and actionable your recommendations will be.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || hasClaudeKey === false}
          className="btn-primary w-full justify-center py-3 text-base"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Starting audit...
            </>
          ) : (
            <>
              <Zap size={18} />
              Run {selectedType.label}
            </>
          )}
        </button>
      </form>
    </div>
  )
}
