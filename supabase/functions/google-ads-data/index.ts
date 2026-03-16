import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? ''

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
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

    const { data: account } = await supabase
      .from('ad_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'google')
      .eq('is_connected', true)
      .maybeSingle()

    if (!account) {
      return new Response(JSON.stringify({ error: 'No connected Google Ads account found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accessToken = await getValidAccessToken(supabase, account)
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Could not refresh Google Ads access token. Please reconnect your account.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const customerIds: string[] = account.metadata?.customer_ids?.length
      ? account.metadata.customer_ids
      : account.google_customer_id
        ? [account.google_customer_id]
        : []

    if (customerIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No Google Ads customer IDs found.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const results = await Promise.all(
      customerIds.slice(0, 5).map(id => fetchCustomerData(accessToken, id))
    )

    const liveData = {
      fetched_at: new Date().toISOString(),
      accounts: results.filter(r => r !== null),
    }

    await supabase
      .from('ad_accounts')
      .update({
        live_data: liveData,
        live_data_fetched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', 'google')

    return new Response(JSON.stringify({ success: true, data: liveData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  account: Record<string, unknown>
): Promise<string | null> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at as string) : null
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000

  if (!isExpired && account.access_token) {
    return account.access_token as string
  }

  if (!account.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token as string,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) return null

  const tokens = await res.json()
  const newExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

  await supabase
    .from('ad_accounts')
    .update({
      access_token: tokens.access_token,
      token_expires_at: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', account.user_id as string)
    .eq('platform', 'google')

  return tokens.access_token
}

async function fetchCustomerData(accessToken: string, customerId: string): Promise<Record<string, unknown> | null> {
  const cleanId = customerId.replace(/-/g, '')

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
  }

  const body = JSON.stringify({ query })

  try {
    const res = await fetch(
      `https://googleads.googleapis.com/v17/customers/${cleanId}/googleAds:search`,
      { method: 'POST', headers, body }
    )

    if (!res.ok) {
      const errText = await res.text()
      console.error(`Google Ads API error for customer ${cleanId}:`, errText)
      return { customer_id: cleanId, error: `API error ${res.status}`, campaigns: [] }
    }

    const data = await res.json()
    const rows = data.results || []

    const campaigns = rows.map((row: Record<string, unknown>) => {
      const campaign = row.campaign as Record<string, unknown>
      const metrics = row.metrics as Record<string, unknown>
      const costMicros = Number(metrics?.cost_micros ?? 0)
      return {
        id: campaign?.id,
        name: campaign?.name,
        status: campaign?.status,
        type: campaign?.advertising_channel_type,
        impressions: Number(metrics?.impressions ?? 0),
        clicks: Number(metrics?.clicks ?? 0),
        cost: costMicros / 1_000_000,
        conversions: Number(metrics?.conversions ?? 0),
        ctr: Number(metrics?.ctr ?? 0),
        avg_cpc: Number(metrics?.average_cpc ?? 0) / 1_000_000,
        cost_per_conversion: Number(metrics?.cost_per_conversion ?? 0) / 1_000_000,
      }
    })

    const totalSpend = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.cost as number), 0)
    const totalClicks = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.clicks as number), 0)
    const totalImpressions = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.impressions as number), 0)
    const totalConversions = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.conversions as number), 0)

    return {
      customer_id: cleanId,
      campaigns,
      summary: {
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter((c: Record<string, unknown>) => c.status === 'ENABLED').length,
        total_spend_30d: totalSpend,
        total_clicks_30d: totalClicks,
        total_impressions_30d: totalImpressions,
        total_conversions_30d: totalConversions,
        avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cost_per_conversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
    }
  } catch (err) {
    console.error(`Failed to fetch data for customer ${cleanId}:`, err)
    return null
  }
}
