import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Key, Check, X, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react'
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
  value: '',
  saved: false,
  editing: false,
  loading: false,
  error: '',
  show: false,
})

interface PlatformState {
  account_id: string
  account_name: string
  is_connected: boolean
  loading: boolean
  editing: boolean
}

const defaultPlatformState = (): PlatformState => ({
  account_id: '',
  account_name: '',
  is_connected: false,
  loading: false,
  editing: false,
})

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [claudeKey, setClaudeKey] = useState<KeyState>(defaultKeyState())
  const [platforms, setPlatforms] = useState<Record<string, PlatformState>>(
    Object.fromEntries(PLATFORMS.map(p => [p.id, defaultPlatformState()]))
  )
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const [keysRes, accountsRes] = await Promise.all([
        supabase.from('api_keys').select('*').eq('user_id', user.id),
        supabase.from('ad_accounts').select('*').eq('user_id', user.id),
      ])
      const keys = keysRes.data || []
      const accounts = accountsRes.data || []

      const claudeEntry = keys.find(k => k.service === 'claude')
      if (claudeEntry) {
        setClaudeKey(prev => ({
          ...prev,
          value: claudeEntry.key_value,
          saved: true,
        }))
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

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-slate-400 text-sm mt-1">Connect your Claude API key and ad platform accounts to enable AI-powered audits</p>
      </div>

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
                  <span className="badge-success">
                    <Check size={11} /> Connected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Your key is stored securely and only used to run audits on your behalf.{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-0.5"
                >
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
                    <button
                      type="button"
                      onClick={() => setClaudeKey(prev => ({ ...prev, show: !prev.show }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {claudeKey.show ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <button type="submit" disabled={claudeKey.loading} className="btn-primary shrink-0">
                    {claudeKey.loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Save
                  </button>
                  {claudeKey.editing && (
                    <button
                      type="button"
                      onClick={() => setClaudeKey(prev => ({ ...prev, editing: false }))}
                      className="btn-ghost"
                    >
                      <X size={14} />
                    </button>
                  )}
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#0f1117] border border-[#1e2d45] rounded-lg">
                    <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                    <span className="text-xs text-slate-400 font-mono">
                      {claudeKey.value.slice(0, 12)}{'•'.repeat(16)}
                    </span>
                  </div>
                  <button
                    onClick={() => setClaudeKey(prev => ({ ...prev, editing: true }))}
                    className="btn-ghost text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={removeClaudeKey}
                    disabled={claudeKey.loading}
                    className="btn-danger text-xs"
                  >
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
        <p className="section-subtitle mb-4">Connect your ad accounts by entering your account IDs. OAuth token exchange support coming soon.</p>

        <div className="grid grid-cols-1 gap-4">
          {PLATFORMS.map(platform => {
            const ps = platforms[platform.id]
            return (
              <div key={platform.id} className="card p-5">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 ${platform.bgClass} border ${platform.borderClass} rounded-lg flex items-center justify-center shrink-0`}>
                    <span className={`text-xs font-bold ${platform.textClass}`}>
                      {platform.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-200 text-sm">{platform.name}</span>
                      {ps.is_connected && (
                        <span className="badge-success">
                          <Check size={11} /> Connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      {getAccountNote(platform.id)}
                    </p>

                    {(!ps.is_connected || ps.editing) ? (
                      <form onSubmit={e => savePlatform(platform.id, e)} className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={ps.account_id}
                            onChange={e => setPlatforms(prev => ({
                              ...prev,
                              [platform.id]: { ...prev[platform.id], account_id: e.target.value },
                            }))}
                            placeholder={getAccountIdPlaceholder(platform.id)}
                            className="input text-xs font-mono"
                            required
                          />
                          <input
                            type="text"
                            value={ps.account_name}
                            onChange={e => setPlatforms(prev => ({
                              ...prev,
                              [platform.id]: { ...prev[platform.id], account_name: e.target.value },
                            }))}
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
                            <button
                              type="button"
                              onClick={() => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], editing: false } }))}
                              className="btn-ghost text-xs"
                            >
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
                        <button
                          onClick={() => setPlatforms(prev => ({ ...prev, [platform.id]: { ...prev[platform.id], editing: true } }))}
                          className="btn-ghost text-xs"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => disconnectPlatform(platform.id)}
                          disabled={ps.loading}
                          className="btn-danger text-xs"
                        >
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

function getAccountNote(platform: string): string {
  const notes: Record<string, string> = {
    google: 'Enter your Google Ads Customer ID (e.g. 123-456-7890). Found in the top-right of your Google Ads account.',
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
    google: '123-456-7890',
    meta: '123456789012345',
    linkedin: '12345678',
    tiktok: '1234567890123456789',
    microsoft: '12345678',
    youtube: 'Same as Google Ads',
  }
  return placeholders[platform] || 'Account ID'
}
