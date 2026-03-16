import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-ads-oauth/callback`

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace(/.*google-ads-oauth/, '')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    if (path === '/callback' || path === '/callback/') {
      return await handleCallback(req, url, supabase)
    }
    return await handleInitiate(req, url, supabase)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handleInitiate(req: Request, _url: URL, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!GOOGLE_CLIENT_ID) {
    return new Response(JSON.stringify({ error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET secrets.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const anonClient = createClient(
    SUPABASE_URL,
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: userError } = await anonClient.auth.getUser()
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const state = `${user.id}:${crypto.randomUUID()}`

  await supabase.from('ad_accounts').upsert(
    {
      user_id: user.id,
      platform: 'google',
      account_id: 'pending',
      account_name: 'Google Ads',
      is_connected: false,
      access_token: '',
      refresh_token: '',
      oauth_state: state,
    },
    { onConflict: 'user_id,platform' }
  )

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  return new Response(JSON.stringify({ url: authUrl }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function handleCallback(_req: Request, url: URL, supabase: ReturnType<typeof createClient>) {
  const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.redirect(`${appUrl}/integrations?google_error=${encodeURIComponent(error)}`, 302)
  }

  if (!code || !state) {
    return Response.redirect(`${appUrl}/integrations?google_error=missing_params`, 302)
  }

  const [userId] = state.split(':')
  if (!userId) {
    return Response.redirect(`${appUrl}/integrations?google_error=invalid_state`, 302)
  }

  const { data: account } = await supabase
    .from('ad_accounts')
    .select('oauth_state')
    .eq('user_id', userId)
    .eq('platform', 'google')
    .maybeSingle()

  if (!account || account.oauth_state !== state) {
    return Response.redirect(`${appUrl}/integrations?google_error=state_mismatch`, 302)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const errText = await tokenRes.text()
    console.error('Token exchange failed:', errText)
    return Response.redirect(`${appUrl}/integrations?google_error=token_exchange_failed`, 302)
  }

  const tokens = await tokenRes.json()
  const { access_token, refresh_token, expires_in } = tokens

  const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()

  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}

  const customerIds = await fetchAccessibleCustomers(access_token)
  const primaryCustomerId = customerIds[0] || ''
  const displayName = userInfo.email ? `Google Ads (${userInfo.email})` : 'Google Ads'

  await supabase.from('ad_accounts').upsert(
    {
      user_id: userId,
      platform: 'google',
      account_id: primaryCustomerId || 'connected',
      account_name: displayName,
      google_customer_id: primaryCustomerId,
      is_connected: true,
      access_token,
      refresh_token: refresh_token || '',
      token_expires_at: expiresAt,
      oauth_state: null,
      metadata: { email: userInfo.email, customer_ids: customerIds },
    },
    { onConflict: 'user_id,platform' }
  )

  return Response.redirect(`${appUrl}/integrations?google_connected=true`, 302)
}

async function fetchAccessibleCustomers(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(
      'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'developer-token': Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? '',
        },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.resourceNames || []).map((name: string) => name.replace('customers/', ''))
  } catch {
    return []
  }
}
