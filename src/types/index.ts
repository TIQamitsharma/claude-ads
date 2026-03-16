export interface Profile {
  id: string
  display_name: string
  avatar_url: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  user_id: string
  service: string
  key_value: string
  created_at: string
  updated_at: string
}

export interface AdAccount {
  id: string
  user_id: string
  platform: string
  account_id: string
  account_name: string
  access_token: string
  refresh_token: string
  token_expires_at: string | null
  is_connected: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type AuditStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface AuditRun {
  id: string
  user_id: string
  audit_type: string
  platform: string
  industry: string
  landing_url: string
  competitor_name: string
  brand_url: string
  status: AuditStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Finding {
  category: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  platform?: string
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  platform?: string
}

export interface AuditResult {
  id: string
  run_id: string
  user_id: string
  overall_score: number
  grade: string
  platform_scores: Record<string, number>
  findings: Finding[]
  recommendations: Recommendation[]
  quick_wins: string[]
  raw_output: string
  created_at: string
}

export interface BrandProfile {
  id: string
  user_id: string
  brand_name: string
  website_url: string
  colors: string[]
  fonts: string[]
  tone_of_voice: string
  logo_url: string
  raw_profile: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type Platform = 'google' | 'meta' | 'linkedin' | 'tiktok' | 'microsoft' | 'youtube' | 'apple'

export interface PlatformConfig {
  id: Platform
  name: string
  color: string
  bgClass: string
  textClass: string
  borderClass: string
  dotClass: string
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'google',
    name: 'Google Ads',
    color: '#ea4335',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/20',
    dotClass: 'bg-red-400',
  },
  {
    id: 'meta',
    name: 'Meta Ads',
    color: '#1877f2',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/20',
    dotClass: 'bg-blue-400',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Ads',
    color: '#0077b5',
    bgClass: 'bg-sky-500/10',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/20',
    dotClass: 'bg-sky-400',
  },
  {
    id: 'tiktok',
    name: 'TikTok Ads',
    color: '#ff0050',
    bgClass: 'bg-pink-500/10',
    textClass: 'text-pink-400',
    borderClass: 'border-pink-500/20',
    dotClass: 'bg-pink-400',
  },
  {
    id: 'microsoft',
    name: 'Microsoft Ads',
    color: '#00a4ef',
    bgClass: 'bg-cyan-500/10',
    textClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/20',
    dotClass: 'bg-cyan-400',
  },
  {
    id: 'youtube',
    name: 'YouTube Ads',
    color: '#ff0000',
    bgClass: 'bg-rose-500/10',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/20',
    dotClass: 'bg-rose-400',
  },
]

export const AUDIT_TYPES = [
  { id: 'audit', label: 'Full Multi-Platform Audit', description: '186 checks across all platforms', platform: 'all' },
  { id: 'google', label: 'Google Ads', description: '74 checks: Search, PMax, Display, YouTube', platform: 'google' },
  { id: 'meta', label: 'Meta Ads', description: '46 checks: Facebook, Instagram, Advantage+', platform: 'meta' },
  { id: 'linkedin', label: 'LinkedIn Ads', description: '25 checks: B2B, TLA, ABM', platform: 'linkedin' },
  { id: 'tiktok', label: 'TikTok Ads', description: '25 checks: Creative, Spark, Smart+', platform: 'tiktok' },
  { id: 'microsoft', label: 'Microsoft Ads', description: '20 checks: Bing, Copilot integration', platform: 'microsoft' },
  { id: 'youtube', label: 'YouTube Ads', description: 'Skippable, Bumper, Shorts analysis', platform: 'youtube' },
  { id: 'creative', label: 'Creative Quality', description: 'Cross-platform creative + fatigue detection', platform: 'all' },
  { id: 'landing', label: 'Landing Page', description: 'Conversion rate, speed, message match', platform: 'all' },
  { id: 'budget', label: 'Budget Allocation', description: '70/20/10 framework, bidding strategy', platform: 'all' },
  { id: 'competitor', label: 'Competitor Research', description: 'Ad intelligence across platforms', platform: 'all' },
  { id: 'plan', label: 'Strategic Plan', description: 'Full advertising strategy by industry', platform: 'all' },
]

export const INDUSTRIES = [
  { id: 'saas', label: 'SaaS / Software' },
  { id: 'ecommerce', label: 'E-commerce / Retail' },
  { id: 'local-service', label: 'Local Services' },
  { id: 'b2b-enterprise', label: 'B2B Enterprise' },
  { id: 'info-products', label: 'Info Products / Courses' },
  { id: 'mobile-app', label: 'Mobile App' },
  { id: 'real-estate', label: 'Real Estate' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'finance', label: 'Finance / Fintech' },
  { id: 'agency', label: 'Marketing Agency' },
  { id: 'generic', label: 'Other / General' },
]
