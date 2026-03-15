import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

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

    const { url, brand_name } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: keyData } = await supabase
      .from('api_keys')
      .select('key_value')
      .eq('user_id', user.id)
      .eq('service', 'claude')
      .maybeSingle()

    if (!keyData?.key_value) {
      return new Response(JSON.stringify({ error: 'Claude API key not configured. Add it in Integrations.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are a brand identity expert. Analyze the website at ${url} and extract the brand DNA.

Based on what you know about this website/brand, provide a comprehensive brand DNA analysis.

${brand_name ? `Brand name: ${brand_name}` : ''}

Return your analysis in this EXACT structured format:

BRAND_NAME: [brand name]
COLORS: [comma-separated hex codes, e.g. #1a1a2e,#e94560,#0f3460]
FONTS: [comma-separated font names, e.g. Inter, Poppins, Georgia]
TONE: [2-3 sentence description of the brand's tone of voice and personality]
LOGO_URL: [if you know the logo URL, provide it, otherwise leave blank]

Then provide a JSON block with extended brand details:
\`\`\`json
{
  "tagline": "...",
  "brand_values": ["value1", "value2"],
  "target_audience": "...",
  "brand_archetype": "...",
  "visual_style": "...",
  "competitive_positioning": "...",
  "ad_tone_guidelines": "...",
  "key_messages": ["message1", "message2"]
}
\`\`\``

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': keyData.key_value,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await claudeRes.json()
    const rawOutput = claudeData.content?.[0]?.text || ''

    const brandNameMatch = rawOutput.match(/BRAND_NAME:\s*([^\n]+)/i)
    const colorsMatch = rawOutput.match(/COLORS:\s*([^\n]+)/i)
    const fontsMatch = rawOutput.match(/FONTS:\s*([^\n]+)/i)
    const toneMatch = rawOutput.match(/TONE:\s*([^\n]+(?:\n(?!LOGO_URL:|FONTS:|COLORS:|BRAND_NAME:)[^\n]+)*)/i)
    const logoMatch = rawOutput.match(/LOGO_URL:\s*([^\n]+)/i)

    const extractedName = brandNameMatch?.[1]?.trim() || brand_name || ''
    const colors = (colorsMatch?.[1] || '').split(',').map((c: string) => c.trim()).filter((c: string) => c.startsWith('#'))
    const fonts = (fontsMatch?.[1] || '').split(',').map((f: string) => f.trim()).filter(Boolean)
    const tone = toneMatch?.[1]?.trim() || ''
    const logoUrl = logoMatch?.[1]?.trim() || ''

    let rawProfile: Record<string, unknown> = {}
    const jsonMatch = rawOutput.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        rawProfile = JSON.parse(jsonMatch[1])
      } catch {
        rawProfile = {}
      }
    }

    const { data: savedProfile, error: saveError } = await supabase
      .from('brand_profiles')
      .insert({
        user_id: user.id,
        brand_name: extractedName,
        website_url: url,
        colors,
        fonts,
        tone_of_voice: tone,
        logo_url: logoUrl,
        raw_profile: rawProfile,
      })
      .select()
      .single()

    if (saveError) {
      return new Response(JSON.stringify({ error: saveError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ profile: savedProfile }), {
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
