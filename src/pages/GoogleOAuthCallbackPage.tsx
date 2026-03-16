import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Loader as Loader2 } from 'lucide-react'

export default function GoogleOAuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const error = searchParams.get('google_error')
    const connected = searchParams.get('google_connected')

    if (connected === 'true') {
      setStatus('success')
      setMessage('Google Ads connected successfully.')
      setTimeout(() => navigate('/integrations'), 2000)
    } else if (error) {
      setStatus('error')
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access to Google Ads. Please try again.',
        token_exchange_failed: 'Failed to complete authentication. Please try again.',
        state_mismatch: 'Security check failed. Please try again.',
        missing_params: 'Invalid callback. Please try again.',
        invalid_state: 'Session expired. Please try again.',
      }
      setMessage(errorMessages[error] || `Authentication failed: ${error}`)
      setTimeout(() => navigate('/integrations'), 4000)
    } else {
      navigate('/integrations')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-[#080f1a] flex items-center justify-center">
      <div className="card p-10 max-w-sm w-full text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader2 size={36} className="text-blue-400 animate-spin mx-auto" />
            <p className="text-slate-300 font-medium">Connecting Google Ads...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={28} className="text-green-400" />
            </div>
            <p className="text-slate-200 font-medium">{message}</p>
            <p className="text-slate-500 text-sm">Redirecting to Integrations...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={28} className="text-red-400" />
            </div>
            <p className="text-slate-200 font-medium">Connection failed</p>
            <p className="text-slate-400 text-sm">{message}</p>
            <p className="text-slate-500 text-xs">Redirecting back...</p>
          </>
        )}
      </div>
    </div>
  )
}
