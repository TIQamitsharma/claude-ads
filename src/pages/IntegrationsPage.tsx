import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Key, Check, X, Eye, EyeOff,
  CircleAlert as AlertCircle, CircleCheck as CheckCircle2,
  ExternalLink, Loader as Loader2, RefreshCw, Database,
  TriangleAlert as AlertTriangle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PLATFORMS } from '../types'

interface KeyState {
  value: string
  saved: boolean
  editing: boolean
  loading: boolean
  error: string
  show: boolean
}

const defaultKeyState = (): KeyState => ({
  value: '', saved: false, editing: false, loading: false, error: '', show: false,
})

interface PlatformState {
  account_id: string
  account_name: string
  is_connected: boolean
  loading: boolean
  editing: boolean
  live_data: Record<string, unknown> | null
  live_data_fetched_at: string | null
  is_oauth: boolean
}

const defaultPlatformState = (): PlatformState => ({
  account_id: '', account_name: '', is_connected: false,
  loading: false, editing: false, live_data: null, live_data_fetched_at: null, is_oauth: false,
})

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [claudeKey, setClaudeKey] = useState<KeyState>(defaultKeyState())
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, defaultPlatformState()]))
  )
  const [pageLoading, setPageLoading] = useState(true)
  const [googleOAuthLoading, setGoogleOAuthLoading] = useState(false)
  const [googleOAuthError, setGoogleOAuthError] = useState('')
  const [googleRefreshLoading, setGoogleRefreshLoading] = useState(false)
  const [successBanner, setSuccessBanner] = useState('')

  useEffect(() => {
    if (!user) return

    const googleConnected = searchParams.get('google_connected')
    const googleError = searchParams.get('google_error')
    if (googleConnected === 'true') {
      setSuccessBanner('Google Ads connected successfully!')
      setSearchParams({}, { replace: true })
    } else if (googleError) {
      const msgs: Record<string, string> = {
        access_denied: 'You denied access. Please try again.',
        token_exchange_failed: 'Token exchange failed. Please retry.',
        state_mismatch: 'Security check failed. Please retry.',
      }
      setGoogleOAuthError(msgs[googleError] || `Error: ${googleError}`)
      setSearchParams({}, { replace: true })
    }

    const load = async () => {
      const [keysRes, accountsRes] = await Promise.all([
        supabase.from('api_keys').select('*').eq('user_id', user.id),
        supabase.from('ad_accounts').select('*').eq('user_id', user.id),
      ])
      const keys = keysRes.data || []
      const accounts = accountsRes.data || []

      const claudeEntry = keys.find((k: { service: string; key_value: string }) => k.service === 'claude')
      if (claudeEntry) {
        setClaudeKey(prev => ({ ...prev, value: claudeEntry.key_value, saved: true }))
      }

      const updated: Record<string, PlatformState> = Object.fromEntries(
        PLATFORMS.map(p => [p.id, defaultPlatformState()])
      )
      for (const acct of accounts) {
        if (updated[acct.platform]) {
          updated[acct.platform] = {
            account_id: acct.account_id,
            account_name: acct.account_name,
            is_connected: acct.is_connected,
            loading: false,
            editing: false,
            live_data: acct.live_data || null,
            live_data_fetched_at: acct.live_data_fetched_at || null,
            is_oauth: !!(acct.access_token && acct.access_token !== ''),
          }
        }
      }
      setPlatforms(updated)
      setPageLoading(false)
    }
    load()
  }, [user])

  const saveClaudeKey = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !claudeKey.value.trim()) return
    setClaudeKey(prev => ({ ...prev, loading: true, error: '' }))
    const { error } = await supabase
      .from('api_keys')
      .upsert({ user_id: user.id, service: 'claude', key_value: claudeKey.value.trim() }, { onConflict: 'user_id,service' })
    if (error) {
      setClaudeKey(prev => ({ ...prev, loading: false, error: error.message }))
    } else {
      setClaudeKey(prev => ({ ...prev, loading: false, saved: true, editing: false }))
    }
  }

  const removeClaudeKey = async () => {
    if (!user) return
    setClaudeKey(prev => ({ ...prev, loading: true }))
    await supabase.from('api_keys').delete().eq('user_id', user.id).eq('service', 'claude')
    setClaudeKey({ ...defaultKeyState() })
  }

  const connectGoogle = async () => {
    if (!user) return
    setGoogleOAuthLoading(true)
    setGoogleOAuthError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/google-ads-oauth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || anonKey}`,
          Apikey: anonKey,
        },
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setGoogleOAuthError(data.error || 'Failed to initiate Google login.')
        setGoogleOAuthLoading(false)
        return
      }
      window.location.href = data.url
    } catch {
      setGoogleOAuthError('Failed to connect. Please try again.')
      setGoogleOAuthLoading(false)
    }
  }

  const disconnectGoogle = async () => {
    if (!user) return
    setPlatforms(prev => ({ ...prev, google: { ...prev.google, loading: true } }))
    await supabase
      .from('ad_accounts')
      .update({ is_connected: false, access_token: '', refresh_token: '', live_data: null })
      .eq('user_id', user.id)
      .eq('platform', 'google')
    setPlatforms(prev => ({ ...prev, google: { ...defaultPlatformState() } }))
  }

  const refreshGoogleData = async () => {
    if (!user) return
    setGoogleRefreshLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(`${supabaseUrl}/functions/v1/google-ads-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || anonKey}`,
          Apikey: anonKey,
        },
      })
      const data = await res.json()
      if (res.ok && data.data) {
        setPlatforms(prev => ({
          ...prev,
          google: {
            ...prev.google,
            live_data: data.data,
            live_data_fetched_at: new Date().toISOString(),
          },
        }))
      }
    } catch { /* silent */ }
    setGoogleRefreshLoading(false)
  }

  const savePlatform = async (platformId: string, e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    const ps = platforms[platformId]
    if (!ps.account_id.trim()) return
    setPlatforms(prev => ({ ...prev, [platformId]: { ...prev[platformId], loading: true } }))
    const { error } = await supabase.from('ad_accounts').upsert(
      {
        user_id: user.id,
        platform: platformId,
        account_id: ps.account_id.trim(),
        account_name: ps.account_name.trim() || ps.account_id.trim(),
        is_connected: true,
        access_token: '',
        refresh_token: '',
      },
      { onConflict: 'user_id,platform' }
    )
    if (error) {
      setPlatforms(prev => ({ ...prev, [platformId]: { ...prev[platformId], loading: false } }))
    } else {
      setPlatforms(prev => ({
        ...prev,
        [platformId]: {
          ...prev[platformId],
          is_connected: true,
          loading: false,
          editing: false,
          account_name: ps.account_name || ps.account_id,
        },
      }))
    }
  }

  const disconnectPlatform = async (platformId: string) => {
    if (!user) return
    setPlatforms(prev => ({ ...prev, [platformId]: { ...prev[platformId], loading: true } }))
    await supabase
      .from('ad_accounts')
      .update({ is_connected: false, access_token: '', refresh_token: '' })
      .eq('user_id', user.id)
      .eq('platform', platformId)
    setPlatforms(prev => ({
      ...prev,
      [platformId]: {
        ...defaultPlatformState(),
        account_id: prev[platformId].account_id,
        account_name: prev[platformId].account_name,
        is_connected: false,
      },
    }))
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-blue-400 animate-spin" />
      </div>
    )
  }

  const googlePs = platforms.google

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-slate-400 text-sm mt-1">Connect your Claude API key and ad platform accounts to enable AI-powered audits</p>
      </div>

      {successBanner && (
        <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
          <CheckCircle2 size={16} />
          {successBanner}
        </div>
      )}

      <section>
        <h2 className="section-title mb-1">Claude API</h2>
        <p className="section-subtitle mb-4">Required to run AI-powered audits. Get your key from the Anthropic console.</p>

        <div className="card p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-[#0f1117] border border-[#1e2d45] rounded-lg flex items-center justify-center shrink-0">
              <Key size={18} className="text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-200 text-sm">Anthropic / Claude API</span>
                {claudeKey.saved && !claudeKey.editing && (
                  <span className="badge-success"><Check size={11} /> Connected</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Your key is stored securely and only used to run audits on your behalf.{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5">
                  Get API key <ExternalLink size={11} />
                </a>
              </p>

              {claudeKey.error && (
                <div className="flex items-center gap-2 text-xs text-red-400 mb-3">
                  <AlertCircle size={13} /> {claudeKey.error}
                </div>
              )}

              {(!claudeKey.saved || claudeKey.editing) ? (
                <form onSubmit={saveClaudeKey} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={claudeKey.show ? 'text' : 'password'}
                      value={claudeKey.value}
                      onChange={e => setClaudeKey(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="sk-ant-api03-..."
                      className="input pr-10 font-mono text-xs"
                      required
                    />
                    <button type="button"
                      onClick={() => setClaudeKey(prev => ({ ...prev, show: !prev.show }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {claudeKey.show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button type="submit" disabled={claudeKey.loading} className="btn-primary shrink-0">
                    {claudeKey.loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save
                  </button>
                  {claudeKey.editing && (
                    <button type="button" onClick={() => setClaudeKey(prev => ({ ...prev, editing: false }))} className="btn-ghost">
                      <X size={14} />
                    </button>
                  )}
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#0f1117] border border-[#1e2d45] rounded-lg">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-mono">{claudeKey.value.slice(0, 12)}{'•'.repeat(16)}</span>
                  </div>
                  <button onClick={() => setClaudeKey(prev => ({ ...prev, editing: true }))} className="btn-ghost text-xs">Edit</button>
                  <button onClick={removeClaudeKey} disabled={claudeKey.loading} className="btn-danger text-xs">
                    {claudeKey.loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section-title mb-1">Ad Platforms</h2>
        <p className="section-subtitle mb-4">Connect your ad accounts to enable live data in audits.</p>

        <div className="grid grid-cols-1 gap-4">
          <div className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-red-400">GO</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-slate-200 text-sm">Google Ads</span>
                  {googlePs.is_connected && (
                    <span className="badge-success"><Check size={11} /> Connected</span>
                  )}
                  {googlePs.is_connected && googlePs.is_oauth && (
                    <span className="badge-neutral text-xs">Live data</span>
                  )}
                </div>

                {googleOAuthError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle size={13} /> {googleOAuthError}
                  </div>
                )}

                {!googlePs.is_connected ? (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      Sign in with Google to connect your Google Ads account and pull live campaign data directly into your audits.
                    </p>
                    <button
                      onClick={connectGoogle}
                      disabled={googleOAuthLoading}
                      className="btn-primary text-sm"
                    >
                      {googleOAuthLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Connecting...</>
                        : <><svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Connect with Google</>
                      }
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#0f1117] border border-[#1e2d45] rounded-lg">
                        <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                        <span className="text-xs text-slate-300">{googlePs.account_name || 'Google Ads'}</span>
                        {googlePs.account_id && googlePs.account_id !== 'pending' && googlePs.account_id !== 'connected' && (
                          <span className="text-xs text-slate-600 font-mono ml-1">{googlePs.account_id}</span>
                        )}
                      </div>
                      <button onClick={refreshGoogleData} disabled={googleRefreshLoading} className="btn-ghost text-xs" title="Refresh live data">
                        <RefreshCw size={13} className={googleRefreshLoading ? 'animate-spin' : ''} />
                        Refresh
                      </button>
                      <button onClick={disconnectGoogle} disabled={googlePs.loading} className="btn-danger text-xs">
                        {googlePs.loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                        Disconnect
                      </button>
                    </div>

                    {googlePs.live_data && (
                      <GoogleLiveDataSummary liveData={googlePs.live_data} fetchedAt={googlePs.live_data_fetched_at} />
                    )}

                    {!googlePs.live_data && googlePs.is_oauth && (
                      <div className="flex items-center gap-2 p-3 bg-[#0f1117] border border-[#1e2d45] rounded-lg">
                        <Database size={14} className="text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-500">No live data yet. </span>
                        <button onClick={refreshGoogleData} disabled={googleRefreshLoading} className="text-xs text-blue-400 hover:text-blue-300">
                          Fetch now
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {PLATFORMS.filter(p => p.id !== 'google').map(platform => {
            const ps = platforms[platform.id]
            return (
              <div key={platform.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 ${platform.bgClass} border ${platform.borderClass} rounded-lg flex items-center justify-center shrink-0`}>
                    <span className={`text-xs font-bold ${platform.textClass}`}>{platform.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-200 text-sm">{platform.name}</span>
                      {ps.is_connected && <span className="badge-success"><Check size={11} /> Connected</span>}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{getAccountNote(platform.id)}</p>

                    {(!ps.is_connected || ps.editing) ? (
                      <form onSubmit={e => savePlatform(platform.id, e)} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={ps.account_id}
                            onChange={e => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], account_id: e.target.value } }))}
                            placeholder={getAccountIdPlaceholder(platform.id)}
                            className="input text-xs font-mono"
                            required
                          />
                          <input
                            type="text"
                            value={ps.account_name}
                            onChange={e => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], account_name: e.target.value } }))}
                            placeholder="Account name (optional)"
                            className="input text-xs"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" disabled={ps.loading} className="btn-primary text-xs">
                            {ps.loading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            Connect
                          </button>
                          {ps.editing && (
                            <button type="button"
                              onClick={() => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], editing: false } }))}
                              className="btn-ghost text-xs">
                              <X size={13} /> Cancel
                            </button>
                          )}
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#0f1117] border border-[#1e2d45] rounded-lg">
                          <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                          <span className="text-xs text-slate-300">{ps.account_name || ps.account_id}</span>
                          <span className="text-xs text-slate-600 font-mono ml-1">{ps.account_id}</span>
                        </div>
                        <button onClick={() => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], editing: true } }))}
                          className="btn-ghost text-xs">Edit</button>
                        <button onClick={() => disconnectPlatform(platform.id)} disabled={ps.loading} className="btn-danger text-xs">
                          {ps.loading ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                          Disconnect
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function GoogleLiveDataSummary({ liveData, fetchedAt }: { liveData: Record<string, unknown>; fetchedAt: string | null }) {
  const accounts = (liveData.accounts as Record<string, unknown>[]) || []
  if (!accounts.length) return null

  const totals = accounts.reduce<{ spend: number; clicks: number; impressions: number; conversions: number; campaigns: number; active: number }>((acc, a) => {
    const s = (a.summary as Record<string, number>) || {}
    return {
      spend: acc.spend + (s.total_spend_30d || 0),
      clicks: acc.clicks + (s.total_clicks_30d || 0),
      impressions: acc.impressions + (s.total_impressions_30d || 0),
      conversions: acc.conversions + (s.total_conversions_30d || 0),
      campaigns: acc.campaigns + (s.total_campaigns || 0),
      active: acc.active + (s.active_campaigns || 0),
    }
  }, { spend: 0, clicks: 0, impressions: 0, conversions: 0, campaigns: 0, active: 0 })

  return (
    <div className="p-3 bg-[#0f1117] border border-[#1e2d45] rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Database size={12} className="text-green-400" />
          Live data — last 30 days
        </span>
        {fetchedAt && (
          <span className="text-xs text-slate-600">
            Updated {new Date(fetchedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Spend" value={`$${totals.spend.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
        <Stat label="Clicks" value={totals.clicks.toLocaleString()} />
        <Stat label="Conversions" value={totals.conversions.toLocaleString('en-US', { maximumFractionDigits: 0 })} />
        <Stat label="Impressions" value={totals.impressions >= 1000 ? `${(totals.impressions / 1000).toFixed(1)}K` : String(totals.impressions)} />
        <Stat label="Campaigns" value={`${totals.active} active / ${totals.campaigns}`} />
        <Stat label="Avg CPC" value={totals.clicks > 0 ? `$${(totals.spend / totals.clicks).toFixed(2)}` : 'N/A'} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-200">{value}</div>
    </div>
  )
}

function getAccountNote(platform: string): string {
  const notes: Record<string, string> = {
    meta: 'Enter your Meta Ads Account ID. Found in Ads Manager → Account Overview.',
    linkedin: 'Enter your LinkedIn Campaign Manager Account ID.',
    tiktok: 'Enter your TikTok Ads Advertiser ID. Found in TikTok Ads Manager settings.',
    microsoft: 'Enter your Microsoft Advertising Account ID.',
    youtube: 'YouTube ads run through Google Ads. Connect your Google Ads account above.',
  }
  return notes[platform] || ''
}

function getAccountIdPlaceholder(platform: string): string {
  const placeholders: Record<string, string> = {
    meta: '123456789012345',
    linkedin: '12345678',
    tiktok: '1234567890123456789',
    microsoft: '12345678',
    youtube: 'Same as Google Ads',
  }
  return placeholders[platform] || 'Account ID'
}
