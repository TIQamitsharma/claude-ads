import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChartBar as BarChart3, Clock, Zap, Search, ListFilter as Filter } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { AuditRun, AuditResult } from '../types'
import StatusBadge from '../components/ui/StatusBadge'
import { ScoreGaugeInline } from '../components/ui/ScoreGauge'
import LoadingSpinner from '../components/ui/LoadingSpinner'

type FilterStatus = 'all' | 'complete' | 'running' | 'pending' | 'failed'

export default function ResultsPage() {
  const { user } = useAuth()
  const [runs, setRuns] = useState<AuditRun[]>([])
  const [results, setResults] = useState<Record<string, AuditResult>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data: runsData } = await supabase
        .from('audit_runs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const allRuns = runsData || []
      setRuns(allRuns)

      const completedIds = allRuns.filter(r => r.status === 'complete').map(r => r.id)
      if (completedIds.length > 0) {
        const { data: resultsData } = await supabase
          .from('audit_results')
          .select('*')
          .in('run_id', completedIds)
        const map: Record<string, AuditResult> = {}
        for (const r of resultsData || []) {
          map[r.run_id] = r
        }
        setResults(map)
      }
      setLoading(false)
    }
    load()
  }, [user])

  const filtered = runs.filter(run => {
    const matchesSearch =
      !search ||
      run.audit_type.toLowerCase().includes(search.toLowerCase()) ||
      run.platform.toLowerCase().includes(search.toLowerCase()) ||
      (run.industry && run.industry.toLowerCase().includes(search.toLowerCase()))
    const matchesStatus = filterStatus === 'all' || run.status === filterStatus
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Audit Results</h1>
          <p className="text-slate-400 text-sm mt-1">{runs.length} total audit runs</p>
        </div>
        <Link to="/audit" className="btn-primary">
          <Zap size={15} />
          New audit
        </Link>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search audits..."
            className="input pl-9"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="input pl-9 pr-8 appearance-none w-36"
          >
            <option value="all">All status</option>
            <option value="complete">Complete</option>
            <option value="running">Running</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <BarChart3 size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {runs.length === 0 ? 'No audits yet' : 'No results match your filter'}
          </p>
          {runs.length === 0 && (
            <Link to="/audit" className="btn-primary mt-4 inline-flex">
              <Zap size={14} />
              Run first audit
            </Link>
          )}
        </div>
      ) : (
        <div className="card divide-y divide-[#1e2d45]">
          {filtered.map(run => {
            const result = results[run.id]
            return (
              <Link
                key={run.id}
                to={`/results/${run.id}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-800/30 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200 group-hover:text-white capitalize transition-colors">
                      {run.audit_type === 'audit' ? 'Full Audit' : `${run.audit_type} Audit`}
                    </span>
                    {run.platform !== 'all' && (
                      <span className="badge-neutral capitalize">{run.platform}</span>
                    )}
                    {run.industry && (
                      <span className="badge-neutral capitalize">{run.industry}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Clock size={11} />
                    {formatDate(run.created_at)}
                  </div>
                </div>

                <StatusBadge status={run.status} />

                {result && (
                  <ScoreGaugeInline score={result.overall_score} />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
