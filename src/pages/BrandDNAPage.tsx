import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Dna, Globe, Loader2, Plus, Trash2, ExternalLink, Palette, Type, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import type { BrandProfile } from '../types'

export default function BrandDNAPage() {
  const { user } = useAuth()
  const [profiles, setProfiles] = useState<BrandProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [url, setUrl] = useState('')
  const [brandName, setBrandName] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<BrandProfile | null>(null)

  useEffect(() => {
    if (!user) return
    supabase
      .from('brand_profiles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles(data || [])
        setLoading(false)
      })
  }, [user])

  const handleExtract = async (e: FormEvent) => {
    e.preventDefault()
    if (!user || !url.trim()) return
    setError('')
    setExtracting(true)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const { data: { session } } = await supabase.auth.getSession()

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/extract-brand-dna`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || anonKey}`,
          Apikey: anonKey,
        },
        body: JSON.stringify({ url: url.trim(), brand_name: brandName.trim() }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to extract brand DNA')
      }

      const data = await response.json()
      const newProfile: BrandProfile = {
        ...data.profile,
        id: data.profile.id || crypto.randomUUID(),
        user_id: user.id,
      }
      setProfiles(prev => [newProfile, ...prev])
      setSelected(newProfile)
      setUrl('')
      setBrandName('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract brand DNA. Make sure your Claude API key is configured.'
      setError(msg)
    }
    setExtracting(false)
  }

  const handleDelete = async (id: string) => {
    if (!user) return
    await supabase.from('brand_profiles').delete().eq('id', id).eq('user_id', user.id)
    setProfiles(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div className="space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Brand DNA</h1>
        <p className="text-slate-400 text-sm mt-1">
          Extract visual identity, tone of voice, and brand elements from any website
        </p>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Globe size={16} className="text-blue-400" />
          Extract from website
        </h2>
        {error && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleExtract} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Website URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://yourbrand.com"
                className="input"
                required
              />
            </div>
            <div className="w-56">
              <label className="label">Brand name <span className="text-slate-500">(optional)</span></label>
              <input
                type="text"
                value={brandName}
                onChange={e => setBrandName(e.target.value)}
                placeholder="Acme Corp"
                className="input"
              />
            </div>
          </div>
          <button type="submit" disabled={extracting} className="btn-primary">
            {extracting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Plus size={15} />
                Extract Brand DNA
              </>
            )}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="text-blue-400 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="card p-10 text-center">
          <Dna size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No brand profiles yet</p>
          <p className="text-slate-500 text-xs mt-1">Enter a website URL above to extract brand DNA</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="section-title">Saved profiles</h2>
            {profiles.map(profile => (
              <div
                key={profile.id}
                onClick={() => setSelected(profile)}
                className={`card p-4 cursor-pointer transition-all duration-150 ${
                  selected?.id === profile.id
                    ? 'border-blue-500/40 bg-blue-500/5'
                    : 'hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-200 text-sm truncate">
                      {profile.brand_name || new URL(profile.website_url || 'https://unknown').hostname}
                    </div>
                    <a
                      href={profile.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-0.5 mt-0.5"
                    >
                      {profile.website_url} <ExternalLink size={10} />
                    </a>
                    <div className="flex items-center gap-1 mt-2">
                      {(profile.colors || []).slice(0, 5).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(profile.id) }}
                    className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="space-y-4 slide-up">
              <h2 className="section-title">
                {selected.brand_name || 'Brand Profile'}
              </h2>

              {(selected.colors || []).length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-300">
                    <Palette size={14} className="text-blue-400" />
                    Color Palette
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(selected.colors || []).map((color, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg border border-slate-700"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-mono text-slate-400">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selected.fonts || []).length > 0 && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-300">
                    <Type size={14} className="text-blue-400" />
                    Typography
                  </div>
                  <ul className="space-y-1">
                    {(selected.fonts || []).map((font, i) => (
                      <li key={i} className="text-sm text-slate-400">{font}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selected.tone_of_voice && (
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3 text-sm font-medium text-slate-300">
                    <MessageSquare size={14} className="text-blue-400" />
                    Tone of Voice
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{selected.tone_of_voice}</p>
                </div>
              )}

              {selected.logo_url && (
                <div className="card p-4">
                  <div className="text-sm font-medium text-slate-300 mb-3">Logo</div>
                  <img src={selected.logo_url} alt="Brand logo" className="max-h-16 object-contain" />
                </div>
              )}

              {Object.keys(selected.raw_profile || {}).length > 0 && (
                <div className="card p-4">
                  <div className="text-sm font-medium text-slate-300 mb-3">Raw Profile</div>
                  <pre className="text-xs text-slate-500 overflow-x-auto whitespace-pre-wrap leading-relaxed font-mono">
                    {JSON.stringify(selected.raw_profile, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
