import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, BarChart3, Plug, AlertTriangle, ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { AuditRun, AdAccount } from '../types'
import StatusBadge from '../components/ui/StatusBadge'
import { ScoreGaugeInline } from '../components/ui/ScoreGauge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const QUICK_ACTIONS = [
  { label: 'Full Audit', description: '186 checks, all platforms', to: '/audit?type=audit', color: 'from-blue-600 to-blue-700' },
  { label: 'Google Ads', description: '74 weighted checks', to: '/audit?type=google', color: 'from-red-600 to-orange-600' },
  { label: 'Meta Ads', description: '46 weighted checks', to: '/audit?type=meta', color: 'from-blue-500 to-blue-600' },
  { label: 'Landing Page', description: 'Conversion analysis', to: '/audit?type=landing', color: 'from-emerald-600 to-teal-600' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [recentRuns, setRecentRuns] = useState<AuditRun[]>([])
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [hasClaudeKey, setHasClaudeKey] = useState(false)
  const [recentResults, setRecentResults] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there'

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [runsRes, accountsRes, keysRes] = await Promise.all([
        supabase
          .from('audit_runs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('ad_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_connected', true),
        supabase
          .from('api_keys')
          .select('service')
          .eq('user_id', user.id)
          .eq('service', 'claude')
          .maybeSingle(),
      ])
      setRecentRuns(runsRes.data || [])
      setAdAccounts(accountsRes.data || [])
      setHasClaudeKey(!!keysRes.data)

      const completedRuns = (runsRes.data || []).filter(r => r.status === 'complete')
      if (completedRuns.length > 0) {
        const resultsRes = await supabase
          .from('audit_results')
          .select('run_id, overall_score')
          .in('run_id', completedRuns.map(r => r.id))
        const map: Record<string, number> = {}
        for (const r of resultsRes.data || []) {
          map[r.run_id] = r.overall_score
        }
        setRecentResults(map)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const connectedCount = adAccounts.length
  const totalPlatforms = 6

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          Good {getTimeOfDay()}, {displayName}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Here's your ad intelligence overview</p>
      </div>

      {!hasClaudeKey && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-300">Claude API key required</p>
            <p className="text-xs text-amber-400/70 mt-0.5">Add your Anthropic API key to start running audits with AI analysis.</p>
          </div>
          <Link to="/integrations" className="btn-secondary text-xs shrink-0">
            Add key
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Audit Runs</span>
            <BarChart3 size={16} className="text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">{recentRuns.length}</div>
          <div className="text-xs text-slate-500 mt-1">total analyses</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Connected</span>
            <Plug size={16} className="text-green-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">{connectedCount}</div>
          <div className="text-xs text-slate-500 mt-1">of {totalPlatforms} platforms</div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Integrations</span>
            <Zap size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-slate-100">{hasClaudeKey ? 1 : 0}</div>
          <div className="text-xs text-slate-500 mt-1">API keys configured</div>
        </div>
      </div>

      <div>
        <h2 className="section-title mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {QUICK_ACTIONS.map(action => (
            <Link
              key={action.to}
              to={action.to}
              className="card p-4 hover:border-slate-600 transition-all duration-150 group"
            >
              <div className={`w-8 h-8 bg-gradient-to-br ${action.color} rounded-lg mb-3 flex items-center justify-center`}>
                <Zap size={16} className="text-white" />
              </div>
              <div className="font-medium text-slate-200 text-sm group-hover:text-white transition-colors">{action.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{action.description}</div>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent audits</h2>
          <Link to="/results" className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="card p-8 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : recentRuns.length === 0 ? (
          <div className="card p-8 text-center">
            <BarChart3 size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No audits yet</p>
            <p className="text-slate-500 text-xs mt-1">Run your first audit to see results here</p>
            <Link to="/audit" className="btn-primary mt-4 inline-flex">
              <Zap size={14} />
              Run audit
            </Link>
          </div>
        ) : (
          <div className="card divide-y divide-[#1e2d45]">
            {recentRuns.map(run => (
              <Link
                key={run.id}
                to={`/results/${run.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-200 capitalize">
                    {run.audit_type} Audit
                    {run.platform !== 'all' && ` — ${run.platform}`}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} />
                    {formatDate(run.created_at)}
                    {run.industry && <span className="text-slate-600">· {run.industry}</span>}
                  </div>
                </div>
                <StatusBadge status={run.status} />
                {run.status === 'complete' && recentResults[run.id] !== undefined && (
                  <ScoreGaugeInline score={recentResults[run.id]} />
                )}
                {run.status === 'complete' && recentResults[run.id] === undefined && (
                  <CheckCircle size={18} className="text-green-400 shrink-0" />
                )}
                {run.status === 'failed' && (
                  <XCircle size={18} className="text-red-400 shrink-0" />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
