import { Link } from 'react-router-dom'
import { Zap, Shield, Globe, CircleCheck as CheckCircle, ArrowRight, Search, TrendingUp, Target, Brain, Star, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    description: '186 weighted audit checks across all major ad platforms, powered by Claude AI for deep, actionable insights.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Globe,
    title: 'All Major Platforms',
    description: 'Google, Meta, LinkedIn, TikTok, Microsoft, and YouTube — one unified audit suite.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  {
    icon: TrendingUp,
    title: 'Live Data Integration',
    description: 'Connect your Google Ads account via OAuth to pull real campaign data directly into your audits.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
  {
    icon: Target,
    title: 'Actionable Recommendations',
    description: 'Prioritized findings ranked by severity and ROI impact — from critical issues to quick wins.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Search,
    title: 'Competitor Intelligence',
    description: 'Research competitor ad strategies across platforms to find gaps and opportunities.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
  {
    icon: Shield,
    title: 'Brand DNA Extraction',
    description: 'Automatically extract your brand colors, fonts, tone of voice, and identity from your website.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
]

const AUDIT_TYPES = [
  { label: 'Full Multi-Platform Audit', checks: '186 checks', color: 'from-blue-600 to-blue-700' },
  { label: 'Google Ads Deep Analysis', checks: '74 checks', color: 'from-red-600 to-orange-600' },
  { label: 'Meta Ads Analysis', checks: '46 checks', color: 'from-blue-500 to-blue-600' },
  { label: 'Landing Page Conversion', checks: 'CRO analysis', color: 'from-emerald-600 to-teal-600' },
  { label: 'Budget Allocation', checks: '70/20/10 framework', color: 'from-amber-600 to-yellow-600' },
  { label: 'Strategic Ad Planning', checks: '11 industry templates', color: 'from-violet-600 to-purple-600' },
]

const PLATFORMS = [
  { name: 'Google', abbr: 'G', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { name: 'Meta', abbr: 'M', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { name: 'LinkedIn', abbr: 'Li', color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { name: 'TikTok', abbr: 'Tt', color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { name: 'Microsoft', abbr: 'MS', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  { name: 'YouTube', abbr: 'YT', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Performance Marketing Lead',
    company: 'SaaS startup',
    body: 'Cut our Google Ads CPA by 34% in 3 weeks following the audit recommendations. The severity rankings made it obvious what to fix first.',
    stars: 5,
  },
  {
    name: 'Marcus Rivera',
    role: 'Media Buyer',
    company: 'E-commerce brand',
    body: 'Used to spend 2 days auditing Meta campaigns manually. Claude Ads does it in minutes with far more depth than I ever could.',
    stars: 5,
  },
  {
    name: 'Priya Nair',
    role: 'Digital Marketing Director',
    company: 'B2B SaaS',
    body: 'The LinkedIn audit found targeting issues I had completely missed. B2B-specific checks are genuinely useful, not generic advice.',
    stars: 5,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e2d45]/80 bg-[#0f1117]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-semibold text-slate-100 text-sm">Claude Ads</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary text-sm py-1.5 px-4">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute top-32 left-1/3 w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
            <Zap size={12} />
            186 checks across 6 ad platforms
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            <span className="text-slate-100">AI-powered audits for</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              every ad platform
            </span>
          </h1>

          <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Stop wasting ad spend on broken campaigns. Claude Ads runs comprehensive audits across Google, Meta,
            LinkedIn, TikTok, and more — giving you a prioritized action plan in minutes.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/signup" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-150 text-base shadow-lg shadow-blue-500/20">
              Start free audit
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl transition-all duration-150 text-base">
              Sign in
              <ChevronRight size={18} />
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-4">No credit card required · Free to get started</p>
        </div>
      </section>

      {/* Platform logos strip */}
      <section className="py-10 border-y border-[#1e2d45]/60">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs text-slate-500 uppercase tracking-wider mb-6">Audits across all major platforms</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {PLATFORMS.map(p => (
              <div key={p.name} className={`flex items-center gap-2 px-4 py-2 rounded-lg ${p.bg} border ${p.border}`}>
                <span className={`text-xs font-bold ${p.color}`}>{p.abbr}</span>
                <span className="text-sm text-slate-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audit types */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100 mb-3">12 audit types. One platform.</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">From a full multi-platform deep-dive to a targeted landing page conversion analysis.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AUDIT_TYPES.map(type => (
              <div key={type.label} className="card p-5 hover:border-slate-600 transition-all duration-150">
                <div className={`w-9 h-9 bg-gradient-to-br ${type.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Zap size={16} className="text-white" />
                </div>
                <div className="font-medium text-slate-200 text-sm mb-1">{type.label}</div>
                <div className="text-xs text-slate-500">{type.checks}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-[#111827]/50 border-y border-[#1e2d45]/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100 mb-3">Everything you need to fix your ads</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Built for performance marketers who want data-driven decisions, not generic advice.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="card p-5 hover:border-slate-600 transition-all duration-200">
                  <div className={`w-10 h-10 ${f.bg} border ${f.border} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon size={20} className={f.color} />
                  </div>
                  <h3 className="font-semibold text-slate-200 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-100 mb-3">From zero to actionable insights in minutes</h2>
            <p className="text-slate-400 text-lg">No complex setup. Just connect, configure, and run.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Connect your accounts', desc: 'Link your ad accounts via OAuth or manual account IDs. Add your Claude or OpenRouter API key.' },
              { step: '02', title: 'Select your audit type', desc: 'Choose from 12 audit types — a full platform sweep or a focused analysis on one channel.' },
              { step: '03', title: 'Get your action plan', desc: 'Receive a scored report with prioritized findings, recommendations, and quick wins ranked by impact.' },
            ].map(item => (
              <div key={item.step} className="card p-6 relative">
                <div className="text-4xl font-black text-slate-800 mb-3 leading-none">{item.step}</div>
                <h3 className="font-semibold text-slate-200 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Score example */}
      <section className="py-20 px-6 bg-[#111827]/50 border-y border-[#1e2d45]/40">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-100 mb-4">Scored, graded, prioritized</h2>
              <p className="text-slate-400 leading-relaxed mb-6">
                Every audit produces an overall health score and per-platform grades. Findings are categorized as
                critical, high, medium, or low — so you know exactly where to spend your optimization time.
              </p>
              <ul className="space-y-3">
                {[
                  'Overall score 0–100 with letter grade',
                  'Per-platform scores for multi-channel accounts',
                  'Findings ranked by severity impact',
                  'Quick wins for immediate implementation',
                  'Export to Markdown for sharing',
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-300">
                    <CheckCircle size={15} className="text-green-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-300">Full Audit — E-commerce</span>
                <span className="badge-success">Complete</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border-4 border-green-500/40 flex items-center justify-center bg-green-500/10">
                  <div className="text-center">
                    <div className="text-2xl font-black text-green-400">78</div>
                    <div className="text-xs text-green-400/70">B+</div>
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  {[
                    { name: 'Google Ads', score: 82, color: 'bg-green-500' },
                    { name: 'Meta Ads', score: 71, color: 'bg-amber-500' },
                    { name: 'Landing Page', score: 68, color: 'bg-amber-500' },
                  ].map(p => (
                    <div key={p.name}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{p.name}</span><span>{p.score}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700">
                        <div className={`h-1.5 rounded-full ${p.color}`} style={{ width: `${p.score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-start gap-2">
                  <span className="font-semibold shrink-0">[CRITICAL]</span>
                  Smart Bidding without 30+ conversions — insufficient data for optimization
                </div>
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                  <span className="font-semibold shrink-0">[HIGH]</span>
                  7 ad sets below $5/day — budget fragmentation hurting delivery
                </div>
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300 flex items-start gap-2">
                  <span className="font-semibold shrink-0">[QUICK WIN]</span>
                  Add negative keywords list — estimated 15–20% waste reduction
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-slate-100 mb-12">Trusted by performance marketers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card p-5">
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-4">"{t.body}"</p>
                <div>
                  <div className="text-sm font-medium text-slate-200">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role} · {t.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-[#1e2d45]/40">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-6 shadow-lg shadow-blue-500/20">
            <Zap size={28} className="text-white" />
          </div>
          <h2 className="text-4xl font-bold text-slate-100 mb-4">Stop guessing. Start auditing.</h2>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Join marketers who use Claude Ads to find hidden issues, cut wasted spend, and scale what's working.
          </p>
          <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all duration-150 text-lg shadow-lg shadow-blue-500/25">
            Create free account
            <ArrowRight size={20} />
          </Link>
          <p className="text-xs text-slate-500 mt-4">Free to get started · No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e2d45]/40 py-8 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-slate-400">Claude Ads</span>
          </div>
          <p className="text-xs text-slate-600">AI-powered ad intelligence for performance marketers</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Sign in</Link>
            <Link to="/signup" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Sign up</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
