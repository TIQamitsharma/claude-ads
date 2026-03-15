import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { User, Lock, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, Loader as Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function SettingsPage() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name || '')
          setAvatarUrl(data.avatar_url || '')
        }
      })
  }, [user])

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setProfileError('')
    setProfileSuccess(false)
    setProfileLoading(true)
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name: displayName, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    setProfileLoading(false)
    if (error) {
      setProfileError(error.message)
    } else {
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    }
  }

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }
    setPasswordLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordLoading(false)
    if (error) {
      setPasswordError(error.message)
    } else {
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    }
  }

  const emailInitial = (user?.email?.[0] || 'U').toUpperCase()

  return (
    <div className="max-w-xl space-y-8 fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      <section className="card p-5">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <User size={16} className="text-blue-400" />
          Profile
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center text-xl font-semibold text-slate-200">
            {emailInitial}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-200">{user?.email}</div>
            <div className="text-xs text-slate-500 mt-0.5">Member since {new Date(user?.created_at || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
          </div>
        </div>

        {profileError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle size={14} />
            {profileError}
          </div>
        )}

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            <CheckCircle2 size={14} />
            Profile updated successfully
          </div>
        )}

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="label">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="input"
            />
          </div>
          <div>
            <label className="label">Avatar URL <span className="text-slate-500">(optional)</span></label>
            <input
              type="url"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="input"
            />
          </div>
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {profileLoading ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-5 flex items-center gap-2">
          <Lock size={16} className="text-blue-400" />
          Change Password
        </h2>

        {passwordError && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            <AlertCircle size={14} />
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
            <CheckCircle2 size={14} />
            Password changed successfully
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="label">Current password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="input"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="input pr-10"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="label">Confirm new password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="input"
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={passwordLoading} className="btn-primary">
            {passwordLoading ? <Loader2 size={14} className="animate-spin" /> : null}
            {passwordLoading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </section>

      <section className="card p-5">
        <h2 className="section-title mb-2 text-red-400">Danger Zone</h2>
        <p className="text-xs text-slate-500 mb-4">Destructive actions that cannot be undone.</p>
        <button
          className="btn-danger"
          onClick={() => {
            if (confirm('Are you sure? This will delete your account and all data permanently.')) {
              alert('Please contact support to delete your account.')
            }
          }}
        >
          Delete account
        </button>
      </section>
    </div>
  )
}
