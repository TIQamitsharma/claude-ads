import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

interface AuditRequest {
  run_id: string
  audit_type: string
  platform: string
  industry?: string
  landing_url?: string
  competitor_name?: string
  brand_url?: string
  ad_context?: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  let run_id: string | undefined

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: AuditRequest = await req.json()
    const { run_id: bodyRunId, audit_type, platform, industry, landing_url, competitor_name, brand_url, ad_context } = body
    run_id = bodyRunId

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', user.id)
      .eq('service', 'claude')
      .maybeSingle()

    if (!keyData?.key_value) {
      const msg = 'Claude API key not configured. Add it in Integrations.'
      await supabase
        .from('audit_runs')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', run_id)

      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('audit_runs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', run_id)

    const { data: adAccounts } = await supabase
      .from('ad_accounts')
      .select('platform, account_id, account_name, live_data, live_data_fetched_at, access_token, refresh_token, token_expires_at, google_customer_id, metadata, user_id')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    const googleAccount = (adAccounts || []).find(a => a.platform === 'google')
    let googleLiveData: Record<string, unknown> | null = null

    if (googleAccount && (audit_type === 'google' || audit_type === 'audit')) {
      const freshToken = await getValidAccessToken(supabase, googleAccount)
      if (freshToken) {
        googleLiveData = await fetchGoogleLiveData(supabase, freshToken, googleAccount)
      }
    }

    const prompt = buildPrompt({
      audit_type,
      platform,
      industry,
      landing_url,
      competitor_name,
      brand_url,
      ad_context,
      connected_accounts: (adAccounts || []).map(a => ({
        platform: a.platform,
        account_id: a.account_id,
        account_name: a.account_name,
      })),
      google_live_data: googleLiveData,
    })

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyData.key_value,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      let friendlyMsg = `Claude API error (${claudeRes.status})`
      try {
        const errJson = JSON.parse(errText)
        if (errJson?.error?.message) friendlyMsg = errJson.error.message
      } catch { /* use default */ }

      await supabase
        .from('audit_runs')
        .update({ status: 'failed', error_message: friendlyMsg, updated_at: new Date().toISOString() })
        .eq('id', run_id)
      return new Response(JSON.stringify({ error: friendlyMsg }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const rawOutput = claudeData.content?.[0]?.text || ''

    const parsed = parseAuditOutput(rawOutput)

    await supabase.from('audit_results').insert({
      run_id,
      user_id: user.id,
      overall_score: parsed.overall_score,
      grade: parsed.grade,
      platform_scores: parsed.platform_scores,
      findings: parsed.findings,
      recommendations: parsed.recommendations,
      quick_wins: parsed.quick_wins,
      raw_output: rawOutput,
    })

    await supabase
      .from('audit_runs')
      .update({ status: 'complete', updated_at: new Date().toISOString() })
      .eq('id', run_id)

    return new Response(JSON.stringify({ success: true, run_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    if (run_id) {
      await supabase
        .from('audit_runs')
        .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', run_id)
        .catch(() => {})
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN') ?? ''

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  account: Record<string, unknown>
): Promise<string | null> {
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at as string) : null
  const isExpired = !expiresAt || expiresAt.getTime() - Date.now() < 60_000

  if (!isExpired && account.access_token) return account.access_token as string
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
    .update({ access_token: tokens.access_token, token_expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq('user_id', account.user_id as string)
    .eq('platform', 'google')

  return tokens.access_token
}

async function fetchGoogleLiveData(
  supabase: ReturnType<typeof createClient>,
  accessToken: string,
  account: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const customerIds: string[] = (account.metadata as Record<string, unknown>)?.customer_ids as string[]
    || (account.google_customer_id ? [account.google_customer_id as string] : [])

  if (!customerIds.length) return null

  const results = await Promise.all(
    customerIds.slice(0, 3).map(id => fetchCustomerCampaigns(accessToken, id))
  )
  const accounts = results.filter(Boolean)
  if (!accounts.length) return null

  const liveData = { fetched_at: new Date().toISOString(), accounts }
  await supabase
    .from('ad_accounts')
    .update({ live_data: liveData, live_data_fetched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('user_id', account.user_id as string)
    .eq('platform', 'google')

  return liveData
}

async function fetchCustomerCampaigns(accessToken: string, customerId: string): Promise<Record<string, unknown> | null> {
  const cleanId = customerId.replace(/-/g, '')
  const query = `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
      metrics.impressions, metrics.clicks, metrics.cost_micros,
      metrics.conversions, metrics.ctr, metrics.average_cpc, metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC LIMIT 50`

  try {
    const res = await fetch(`https://googleads.googleapis.com/v17/customers/${cleanId}/googleAds:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'developer-token': GOOGLE_ADS_DEVELOPER_TOKEN,
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) return null
    const data = await res.json()
    const rows = data.results || []

    const campaigns = rows.map((row: Record<string, unknown>) => {
      const c = row.campaign as Record<string, unknown>
      const m = row.metrics as Record<string, unknown>
      const costMicros = Number(m?.cost_micros ?? 0)
      return {
        id: c?.id, name: c?.name, status: c?.status, type: c?.advertising_channel_type,
        impressions: Number(m?.impressions ?? 0), clicks: Number(m?.clicks ?? 0),
        cost: costMicros / 1_000_000, conversions: Number(m?.conversions ?? 0),
        ctr: Number(m?.ctr ?? 0), avg_cpc: Number(m?.average_cpc ?? 0) / 1_000_000,
        cost_per_conversion: Number(m?.cost_per_conversion ?? 0) / 1_000_000,
      }
    })

    const totalSpend = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.cost as number), 0)
    const totalClicks = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.clicks as number), 0)
    const totalImpressions = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.impressions as number), 0)
    const totalConversions = campaigns.reduce((s: number, c: Record<string, unknown>) => s + (c.conversions as number), 0)

    return {
      customer_id: cleanId, campaigns,
      summary: {
        total_campaigns: campaigns.length,
        active_campaigns: campaigns.filter((c: Record<string, unknown>) => c.status === 'ENABLED').length,
        total_spend_30d: totalSpend, total_clicks_30d: totalClicks,
        total_impressions_30d: totalImpressions, total_conversions_30d: totalConversions,
        avg_ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
        avg_cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
        cost_per_conversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
    }
  } catch {
    return null
  }
}

function buildPrompt(params: {
  audit_type: string
  platform: string
  industry?: string
  landing_url?: string
  competitor_name?: string
  brand_url?: string
  ad_context?: string
  connected_accounts: Array<{ platform: string; account_id: string; account_name: string }>
  google_live_data?: Record<string, unknown> | null
}): string {
  const { audit_type, platform, industry, landing_url, competitor_name, brand_url, ad_context, connected_accounts, google_live_data } = params

  const accountsText = connected_accounts.length > 0
    ? connected_accounts.map(a => `- ${a.platform}: ${a.account_name} (Account ID: ${a.account_id})`).join('\n')
    : 'No ad accounts connected yet.'

  const contextParts = [
    industry && `Industry: ${industry}`,
    landing_url && `Landing Page URL: ${landing_url}`,
    competitor_name && `Competitor: ${competitor_name}`,
    brand_url && `Brand URL: ${brand_url}`,
    ad_context && `Additional Context: ${ad_context}`,
  ].filter(Boolean).join('\n')

  const typeDescriptions: Record<string, string> = {
    audit: 'Perform a comprehensive multi-platform paid advertising audit covering all connected platforms. Apply 186 weighted checks across Google Ads, Meta Ads, LinkedIn, TikTok, Microsoft Ads, and YouTube. Base your analysis on industry best practices, the connected account IDs provided, and any additional context given. You do not have direct API access — provide expert guidance based on the information available.',
    google: 'Perform a deep Google Ads audit with 74 weighted checks across: Conversion Tracking (25%), Wasted Spend (20%), Account Structure (15%), Keywords (15%), Ad Copy (15%), and Settings (10%). Include PMax, Search, Display, and Smart Bidding analysis. Base your findings on the Google Ads account ID provided and any context given. You do not have direct API access — provide expert guidance and best-practice recommendations.',
    meta: 'Perform a comprehensive Meta Ads audit with 46 checks across: Pixel/CAPI Health (30%), Creative Quality (30%), Account Structure (20%), and Audience Strategy (20%). Include Advantage+ assessment and EMQ optimization. Base your analysis on the Meta account ID and context provided.',
    linkedin: 'Conduct a LinkedIn Ads audit with 25 checks covering: Campaign Structure, Targeting, Creative, Bidding, and Conversion Tracking. Include Thought Leader Ads and ABM evaluation.',
    tiktok: 'Perform a TikTok Ads audit with 25 checks emphasizing creative quality, safe zone compliance, Spark Ads testing, Smart+ campaign evaluation, and TikTok Shop integration.',
    microsoft: 'Audit Microsoft Advertising with 20 checks including Copilot integration features, Google import quality, Multimedia Ads, and unique Microsoft Ads features.',
    youtube: 'Analyze YouTube Ads across Skippable, Non-skippable, Bumper, Shorts, and Demand Gen campaigns. Evaluate hook quality (first 5 seconds), completion rates, and brand safety.',
    creative: 'Assess creative quality and creative fatigue across all connected platforms. Evaluate format diversity, message clarity, visual hierarchy, CTR trends, and recommend refresh cadence.',
    landing: `Analyze the landing page at ${landing_url || '[URL not provided]'} for ad conversion optimization. Evaluate page speed (LCP, FID, CLS), message match to ad copy, trust signals, form optimization, mobile experience, and overall conversion rate potential.`,
    budget: 'Analyze budget allocation and bidding strategy. Apply the 70/20/10 framework (proven/scaling/testing), evaluate bid strategies per platform, identify budget sufficiency issues, and recommend reallocation.',
    competitor: `Research and analyze competitor advertising for "${competitor_name || 'the specified competitor'}". Examine their ad creative, messaging, platform presence, estimated spend, targeting approach, and unique positioning.`,
    plan: `Create a comprehensive paid advertising strategy and campaign plan${industry ? ` for the ${industry} industry` : ''}. Include platform selection, budget allocation, campaign architecture, targeting strategy, creative direction, KPIs, and a phased implementation roadmap.`,
  }

  const instruction = typeDescriptions[audit_type] || typeDescriptions.audit

  let liveDataSection = ''
  if (google_live_data) {
    const accounts = (google_live_data.accounts as Record<string, unknown>[]) || []
    const lines: string[] = []
    for (const acct of accounts) {
      const s = acct.summary as Record<string, number>
      lines.push(`Customer ID: ${acct.customer_id}`)
      lines.push(`  Active campaigns: ${s.active_campaigns} / ${s.total_campaigns}`)
      lines.push(`  30-day spend: $${s.total_spend_30d.toFixed(2)}`)
      lines.push(`  Clicks: ${s.total_clicks_30d.toLocaleString()}, Impressions: ${s.total_impressions_30d.toLocaleString()}`)
      lines.push(`  Conversions: ${s.total_conversions_30d}, CPA: $${s.cost_per_conversion > 0 ? s.cost_per_conversion.toFixed(2) : 'N/A'}`)
      lines.push(`  Avg CTR: ${(s.avg_ctr * 100).toFixed(2)}%, Avg CPC: $${s.avg_cpc.toFixed(2)}`)
      const campaigns = (acct.campaigns as Record<string, unknown>[]) || []
      if (campaigns.length > 0) {
        lines.push('  Top campaigns by spend:')
        for (const c of campaigns.slice(0, 10)) {
          lines.push(`    - [${c.status}] ${c.name} (${c.type}) | Spend: $${(c.cost as number).toFixed(2)} | Clicks: ${c.clicks} | Conv: ${c.conversions} | CTR: ${((c.ctr as number) * 100).toFixed(2)}%`)
        }
      }
    }
    liveDataSection = `\n## Live Google Ads Data (Last 30 Days)\n${lines.join('\n')}\n`
  }

  return `You are a world-class paid advertising expert and consultant. ${instruction}

## Connected Ad Accounts
${accountsText}
${liveDataSection}
## Context
${contextParts || 'No additional context provided.'}

## Output Format

Provide your analysis in the following EXACT structured format:

### OVERALL_SCORE: [0-100]
### GRADE: [A/B/C/D/F]

### PLATFORM_SCORES
[For each relevant platform, one per line in format: PLATFORM: SCORE]

### QUICK_WINS
[List 3-5 quick, actionable improvements that can be implemented immediately]
- [Quick win 1]
- [Quick win 2]
- [Quick win 3]

### FINDINGS
[List all significant findings, each in this format:]
FINDING:
  SEVERITY: [critical/high/medium/low]
  CATEGORY: [category name]
  PLATFORM: [platform name or "all"]
  TITLE: [short finding title]
  DESCRIPTION: [detailed description of the issue and its impact]

### RECOMMENDATIONS
[List all recommendations, each in this format:]
RECOMMENDATION:
  PRIORITY: [high/medium/low]
  PLATFORM: [platform name or "all"]
  TITLE: [short recommendation title]
  DESCRIPTION: [specific, actionable recommendation with expected impact]

### ANALYSIS
[Provide your detailed narrative analysis below, covering all key aspects of the audit]`
}

interface ParsedResult {
  overall_score: number
  grade: string
  platform_scores: Record<string, number>
  findings: Array<{
    severity: string
    category: string
    platform: string
    title: string
    description: string
  }>
  recommendations: Array<{
    priority: string
    platform: string
    title: string
    description: string
  }>
  quick_wins: string[]
}

function parseAuditOutput(raw: string): ParsedResult {
  const result: ParsedResult = {
    overall_score: 0,
    grade: 'N/A',
    platform_scores: {},
    findings: [],
    recommendations: [],
    quick_wins: [],
  }

  const scoreMatch = raw.match(/OVERALL_SCORE:\s*(\d+)/i)
  if (scoreMatch) result.overall_score = Math.min(100, Math.max(0, parseInt(scoreMatch[1])))

  const gradeMatch = raw.match(/GRADE:\s*([A-F][+-]?)/i)
  if (gradeMatch) result.grade = gradeMatch[1].toUpperCase()

  const platformScoreSection = raw.match(/### PLATFORM_SCORES\n([\s\S]*?)(?=###|$)/i)
  if (platformScoreSection) {
    const lines = platformScoreSection[1].split('\n')
    for (const line of lines) {
      const m = line.match(/([A-Za-z]+):\s*(\d+)/)
      if (m) {
        result.platform_scores[m[1].toLowerCase()] = Math.min(100, Math.max(0, parseInt(m[2])))
      }
    }
  }

  const quickWinsSection = raw.match(/### QUICK_WINS\n([\s\S]*?)(?=###|$)/i)
  if (quickWinsSection) {
    const lines = quickWinsSection[1].split('\n')
    for (const line of lines) {
      const trimmed = line.replace(/^[-*•]\s*/, '').trim()
      if (trimmed.length > 5) result.quick_wins.push(trimmed)
    }
  }

  const findingsSection = raw.match(/### FINDINGS\n([\s\S]*?)(?=###|$)/i)
  if (findingsSection) {
    const findingBlocks = findingsSection[1].split(/FINDING:/i).filter(b => b.trim())
    for (const block of findingBlocks) {
      const severity = (block.match(/SEVERITY:\s*([^\n]+)/i)?.[1] || 'low').trim().toLowerCase()
      const category = (block.match(/CATEGORY:\s*([^\n]+)/i)?.[1] || '').trim()
      const platform = (block.match(/PLATFORM:\s*([^\n]+)/i)?.[1] || 'all').trim().toLowerCase()
      const title = (block.match(/TITLE:\s*([^\n]+)/i)?.[1] || '').trim()
      const description = (block.match(/DESCRIPTION:\s*([\s\S]*?)(?=SEVERITY:|CATEGORY:|PLATFORM:|TITLE:|DESCRIPTION:|$)/i)?.[1] || '').trim()
      if (title) {
        result.findings.push({ severity, category, platform, title, description })
      }
    }
  }

  const recsSection = raw.match(/### RECOMMENDATIONS\n([\s\S]*?)(?=###|$)/i)
  if (recsSection) {
    const recBlocks = recsSection[1].split(/RECOMMENDATION:/i).filter(b => b.trim())
    for (const block of recBlocks) {
      const priority = (block.match(/PRIORITY:\s*([^\n]+)/i)?.[1] || 'medium').trim().toLowerCase()
      const platform = (block.match(/PLATFORM:\s*([^\n]+)/i)?.[1] || 'all').trim().toLowerCase()
      const title = (block.match(/TITLE:\s*([^\n]+)/i)?.[1] || '').trim()
      const description = (block.match(/DESCRIPTION:\s*([\s\S]*?)(?=PRIORITY:|PLATFORM:|TITLE:|DESCRIPTION:|$)/i)?.[1] || '').trim()
      if (title) {
        result.recommendations.push({ priority, platform, title, description })
      }
    }
  }

  if (result.overall_score === 0 && raw.length > 100) {
    result.overall_score = 50
    result.grade = 'C'
    result.quick_wins = ['Review the full AI analysis below for detailed recommendations']
  }

  return result
}
