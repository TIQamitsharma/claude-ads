import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, RefreshCw, ChevronDown, ChevronUp, TriangleAlert as AlertTriangle, CircleAlert as AlertCircle, Info, CircleCheck as CheckCircle, Zap, Loader as Loader2, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { AuditRun, AuditResult, Finding, Recommendation } from '../types'
import StatusBadge from '../components/ui/StatusBadge'
import { ScoreGaugeInline, getGrade, getColor } from '../components/ui/ScoreGauge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  high: { label: 'High', icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  medium: { label: 'Medium', icon: Info, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { label: 'Low', icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
}

const PRIORITY_CONFIG = {
  high: { label: 'High Priority', className: 'badge-error' },
  medium: { label: 'Medium Priority', className: 'badge-warning' },
  low: { label: 'Low Priority', className: 'badge-neutral' },
}

export default function ResultDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [run, setRun] = useState<AuditRun | null>(null)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [showRaw, setShowRaw] = useState(false)
  const [polling, setPolling] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadData = async () => {
    if (!user || !id) return
    const [runRes, resultRes] = await Promise.all([
      supabase.from('audit_runs').select('*').eq('id', id).eq('user_id', user.id).maybeSingle(),
      supabase.from('audit_results').select('*').eq('run_id', id).eq('user_id', user.id).maybeSingle(),
    ])
    setRun(runRes.data)
    setResult(resultRes.data)
    setLoading(false)
    return runRes.data
  }

  useEffect(() => {
    loadData()
  }, [user, id])

  useEffect(() => {
    if (!run) return
    if (run.status === 'pending' || run.status === 'running') {
      setPolling(true)
      intervalRef.current = setInterval(async () => {
        const updatedRun = await loadData()
        if (updatedRun?.status === 'complete' || updatedRun?.status === 'failed') {
          clearInterval(intervalRef.current!)
          setPolling(false)
        }
      }, 3000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [run?.status])

  const handleDownload = () => {
    if (!result || !run) return
    const content = `# ${run.audit_type.toUpperCase()} AUDIT RESULTS\n\nOverall Score: ${result.overall_score}/100 (${result.grade})\nDate: ${new Date(result.created_at).toLocaleDateString()}\n\n## Quick Wins\n${(result.quick_wins || []).map(w => `- ${w}`).join('\n')}\n\n## Findings\n${(result.findings || []).map((f: Finding) => `### [${f.severity?.toUpperCase()}] ${f.title}\n${f.description}`).join('\n\n')}\n\n## Recommendations\n${(result.recommendations || []).map((r: Recommendation) => `### [${r.priority?.toUpperCase()}] ${r.title}\n${r.description}`).join('\n\n')}\n\n## Full Output\n${result.raw_output}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${run.audit_type}-${new Date(run.created_at).toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Audit not found</p>
        <Link to="/results" className="btn-secondary mt-4 inline-flex">Back to results</Link>
      </div>
    )
  }

  const isActive = run.status === 'pending' || run.status === 'running'

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center gap-4">
        <Link to="/results" className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-100 capitalize">
              {run.audit_type === 'audit' ? 'Full Audit' : `${run.audit_type} Audit`}
            </h1>
            <StatusBadge status={run.status} />
          </div>
          <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
            <Clock size={11} />
            {formatDate(run.created_at)}
            {run.industry && <><span className="text-slate-700">·</span><span className="capitalize">{run.industry}</span></>}
          </div>
        </div>
        {result && (
          <button onClick={handleDownload} className="btn-secondary">
            <Download size={14} />
            Export
          </button>
        )}
      </div>

      {isActive && (
        <div className="card p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/10 rounded-full mb-4">
            <Loader2 size={28} className="text-blue-400 animate-spin" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-1">
            {run.status === 'pending' ? 'Preparing audit...' : 'Audit in progress...'}
          </h2>
          <p className="text-slate-400 text-sm">
            AI is analyzing your advertising accounts. This may take a few minutes.
          </p>
          {polling && (
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
              <RefreshCw size={12} className="animate-spin" />
              Auto-refreshing every 3 seconds
            </div>
          )}
        </div>
      )}

      {run.status === 'failed' && (
        <div className="card p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-red-500/10 rounded-full mb-3">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <p className="text-slate-300 font-medium mb-1">Audit failed</p>
          <p className="text-slate-500 text-sm">
            {run.error_message || 'An error occurred while running the audit.'}
          </p>
          <Link to="/audit" className="btn-primary mt-4 inline-flex">
            <Zap size={14} /> Try again
          </Link>
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-5 col-span-1 flex items-center gap-4">
              <ScoreGaugeInline score={result.overall_score} />
              <div>
                <div className="text-2xl font-bold" style={{ color: getColor(result.overall_score) }}>
                  {result.overall_score}/100
                </div>
                <div className="text-xs text-slate-400">Overall Health Score</div>
                <div
                  className="text-lg font-bold mt-0.5"
                  style={{ color: getColor(result.overall_score) }}
                >
                  Grade {getGrade(result.overall_score)}
                </div>
              </div>
            </div>

            {Object.entries(result.platform_scores || {}).slice(0, 4).map(([platform, score]) => (
              <div key={platform} className="card p-4 flex items-center gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-300 capitalize">{platform}</div>
                  <div className="text-xl font-bold mt-1" style={{ color: getColor(score as number) }}>
                    {score as number}/100
                  </div>
                  <div className="text-xs text-slate-500">Grade {getGrade(score as number)}</div>
                </div>
              </div>
            ))}
          </div>

          {(result.quick_wins || []).length > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-4 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                Quick Wins
              </h2>
              <ul className="space-y-2">
                {(result.quick_wins || []).map((win, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
                    {win}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.findings || []).length > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Findings</h2>
              <div className="space-y-3">
                {(result.findings as Finding[] || []).map((finding, i) => {
                  const config = SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.low
                  const SevIcon = config.icon
                  return (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${config.bg} ${config.border}`}
                    >
                      <div className="flex items-start gap-2">
                        <SevIcon size={15} className={`${config.color} shrink-0 mt-0.5`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-sm font-medium ${config.color}`}>{finding.title}</span>
                            {finding.platform && (
                              <span className="badge-neutral capitalize">{finding.platform}</span>
                            )}
                            <span className={`badge ${config.bg} ${config.color} border ${config.border} ml-auto`}>
                              {config.label}
                            </span>
                          </div>
                          {finding.category && (
                            <div className="text-xs text-slate-500 mb-1">{finding.category}</div>
                          )}
                          <p className="text-xs text-slate-400 leading-relaxed">{finding.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {(result.recommendations || []).length > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Recommendations</h2>
              <div className="space-y-3">
                {(result.recommendations as Recommendation[] || []).map((rec, i) => {
                  const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.low
                  return (
                    <div key={i} className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/40">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-200">{rec.title}</span>
                            {rec.platform && (
                              <span className="badge-neutral capitalize">{rec.platform}</span>
                            )}
                            <span className={`${config.className} ml-auto`}>{config.label}</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">{rec.description}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {result.raw_output && (
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="w-full flex items-center justify-between p-5 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
              >
                <span>Full AI Output</span>
                {showRaw ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showRaw && (
                <div className="border-t border-[#1e2d45] p-5">
                  <pre className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
                    {result.raw_output}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
