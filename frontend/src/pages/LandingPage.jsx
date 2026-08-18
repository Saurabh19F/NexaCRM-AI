import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  BotMessageSquare,
  BrainCircuit,
  CalendarDays,
  Camera,
  CircleDot,
  Kanban,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Radio,
  Receipt,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
  Zap,
} from 'lucide-react'

/* ── Data ──────────────────────────────────────────────── */

const navItems = ['Home', 'Features', 'Why Choose', 'Testimonial', 'Pricing']

const quickLinks = ['Home', 'About Us', 'Services', 'Products', 'Portfolio', 'Contact']

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: BadgeCheck },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: Camera },
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: Share2 },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: Video },
  { label: 'WhatsApp', href: 'https://wa.me/918985419420', Icon: MessageCircle },
]

const trustedLogos = ['Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta']

const features = [
  { icon: Users, label: 'Lead Management', desc: 'Capture, score, and route leads automatically with AI-powered insights.' },
  { icon: Kanban, label: 'Pipeline Board', desc: 'Drag-and-drop Kanban board to visualise every deal stage at a glance.' },
  { icon: BrainCircuit, label: 'AI Engine', desc: 'Smart recommendations, auto-summaries, and next-best-action prompts.' },
  { icon: MessageCircle, label: 'Communication Hub', desc: 'Unified inbox for email, WhatsApp, and call logs in one timeline.' },
  { icon: Zap, label: 'Automation', desc: 'No-code workflows that trigger tasks, emails, and follow-ups on autopilot.' },
  { icon: BarChart3, label: 'Analytics', desc: 'Real-time dashboards and conversion funnels to track what matters.' },
]

const testimonials = [
  ['ApexPrime', 'NexaCRM AI allowed us to reduce duplicated effort and improve forecasting.', 'Thomas John'],
  ['Global Eleva', 'Our teams got a single source of truth for every customer conversation.', 'Sara Agrawal'],
  ['Minox', 'We implemented workflows faster and gave managers better visibility.', 'Oyin Robertson'],
  ['iNfoty', 'Automation helped us update high-priority accounts without manual effort.', 'Ank Patel'],
]

const faqs = [
  ['How do I migrate to NexaCRM AI?', 'Our team helps import contacts, companies, deals, notes, and activities with guided onboarding.'],
  ['Can teams customize pipelines?', 'Yes. You can create pipelines, fields, automations, and dashboards around your sales process.'],
  ['Does NexaCRM AI include AI assistance?', 'Yes. AI agents can summarize records, recommend next actions, and surface high-value opportunities.'],
]

const stats = [
  ['27%', 'Increased productivity'],
  ['50%', 'Faster implementation'],
  ['71%', 'Saved on licensing fees'],
]

/* ── Spotlight card (same as dashboard) ────────────────── */

function SpotlightCard({ children, className = '', spotlightColor = 'rgba(14, 165, 233, 0.18)' }) {
  const cardRef = useRef(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={cardRef}
      className={`reactbits-spotlight glass-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
    >
      <div
        className="reactbits-spotlight__glow"
        style={{ opacity, background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 64%)` }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/* ── Animated hero heading (gradient text like dashboard) ─ */

function AnimatedHeading({ text }) {
  const words = text.split(' ')
  return (
    <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-[1.12] sm:text-4xl lg:text-[44px]">
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block animate-[fadeInUp_0.7s_ease-out_both] reactbits-gradient-text"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </h1>
  )
}

/* ── Chatbot ───────────────────────────────────────────── */

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi, I am Kriscel's AI assistant. Ask me about automation, marketing, recruitment, or how our team can help." },
  ])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isSending) return

    const nextMessages = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }),
      })
      const data = await response.json()
      if (!response.ok || !data.message) throw new Error(data.error || 'The assistant could not respond.')
      setMessages((cur) => [...cur, { role: 'assistant', content: data.message }])
    } catch {
      setMessages((cur) => [...cur, { role: 'assistant', content: 'Sorry, I could not respond right now. Please try again later.' }])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4 sm:bottom-7 sm:right-7">
      {isOpen && (
        <section aria-label="AI chat" className="w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[390px]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-brand-600 to-accent-500 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur">
                <Bot size={21} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold text-white">NexaCRM AI Assistant</h2>
                <p className="text-xs text-white/70">Powered by AI</p>
              </div>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25">
              <X size={18} />
            </button>
          </div>

          <div className="flex max-h-[360px] min-h-[300px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-brand-500 text-white'
                    : 'rounded-bl-md border border-slate-100 bg-slate-50 text-slate-700'
                }`}>
                  {msg.content}
                </p>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <Loader2 size={16} className="animate-spin" /> Thinking
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
            <label className="sr-only" htmlFor="chat-msg">Message</label>
            <textarea
              id="chat-msg" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
              placeholder="Type your message..." rows={1}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
            <button type="submit" disabled={isSending || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((c) => !c)}
        className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(14,165,233,0.35)]">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
          <BotMessageSquare size={18} strokeWidth={2.1} />
        </span>
        <span className="hidden pr-1 sm:inline">AI Chat</span>
      </button>
    </div>
  )
}

/* ── Mobile nav drawer ─────────────────────────────────── */

function MobileNav({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <nav className="absolute right-0 top-0 flex h-full w-64 flex-col gap-1 bg-white p-6 shadow-xl">
        <button onClick={onClose} className="mb-4 self-end text-slate-500 hover:text-slate-900"><X size={20} /></button>
        {navItems.map((item) => (
          <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-600">
            {item}
          </a>
        ))}
        <div className="mt-4 space-y-2">
          <Link to="/login" className="block rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">Login</Link>
          <a href="#contact" onClick={onClose} className="block rounded-full bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-brand-600">Contact Us</a>
        </div>
      </nav>
    </div>
  )
}

/* ── Landing Page ──────────────────────────────────────── */

export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <main className="bg-white text-slate-900 font-sans antialiased">
      <div className="mx-auto max-w-7xl bg-white">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden px-5 pt-5 sm:px-8 lg:px-16">
          {/* Aurora-style background (matching dashboard) */}
          <div className="absolute inset-x-0 top-0 h-[620px] overflow-hidden">
            <div className="reactbits-aurora absolute inset-0" />
            <div className="reactbits-aurora__band reactbits-aurora__band--one absolute inset-0" />
            <div className="reactbits-aurora__band reactbits-aurora__band--two absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="relative z-10">
            {/* Navbar */}
            <header className="sticky top-4 z-30 mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/70 px-3.5 py-2 shadow-[0_10px_28px_rgba(14,165,233,0.08)] backdrop-blur-2xl">
              <Link to="/" className="group flex min-w-0 items-center gap-2 rounded-full pr-2">
                <img src="/brand/nexacrm-ai-icon.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
                <span className="text-[15px] font-bold tracking-tight text-slate-900">NexaCRM AI</span>
              </Link>

              <nav aria-label="Primary" className="hidden items-center gap-1 text-[12px] font-semibold text-slate-600 lg:flex">
                {navItems.map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className={`rounded-full px-3 py-1.5 transition ${item === 'Home' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'hover:bg-brand-50/60 hover:text-brand-600'}`}>
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden h-8 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-[11px] font-semibold text-slate-900 shadow-sm transition hover:border-brand-300 hover:text-brand-600 sm:inline-flex">Login</Link>
                <a href="#contact" className="hidden h-8 items-center justify-center gap-1.5 rounded-full bg-brand-500 px-4 text-[11px] font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 sm:inline-flex">
                  Contact Us <ArrowRight size={12} />
                </a>
                <button aria-label="Open menu" onClick={() => setMobileNav(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 shadow-sm transition hover:bg-white lg:hidden">
                  <Menu size={16} />
                </button>
              </div>
            </header>

            <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />

            {/* Hero content */}
            <div id="home" className="relative mx-auto max-w-3xl pb-6 pt-14 text-center sm:pt-16">
              {/* Signal pill (matching dashboard) */}
              <div className="nexa-signal-pill mx-auto mb-5 w-fit">
                <Radio className="h-3.5 w-3.5" />
                AI-Powered CRM Platform
              </div>

              <AnimatedHeading text="Simplify CRM Management Boost Productivity" />

              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-600">
                Easily manage leads, customers, and sales activity from first touch to closed deal — powered by intelligent automation.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:bg-brand-600 hover:shadow-brand-500/35">
                  Get Started Free <ArrowRight size={15} />
                </Link>
                <a href="#testimonial" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 transition hover:border-brand-300 hover:text-brand-600">
                  Book a Demo <CalendarDays size={15} />
                </a>
              </div>

              {/* Orbit tiles (matching dashboard hero) */}
              <div className="mt-7 flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Live Signal', icon: Radio, tone: 'emerald' },
                  { label: 'AI Assist', icon: BrainCircuit, tone: 'cyan' },
                  { label: 'Secure CRM', icon: ShieldCheck, tone: 'violet' },
                ].map(({ label, icon: Icon, tone }) => (
                  <div key={label} className={`nexa-orbit-tile nexa-orbit-tile--${tone}`}>
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero dashboard image */}
            <div className="relative mx-auto mt-2 max-w-4xl pb-10">
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-brand-500/10 ring-4 ring-white/50">
                <div className="relative h-[190px] sm:h-[250px] lg:h-[320px]">
                  <img src="/hero-dashboard.png" alt="NexaCRM AI dashboard overview" className="h-full w-full object-cover object-top" />
                </div>
              </div>
            </div>

            {/* Logo bar */}
            <div className="mx-auto flex max-w-5xl flex-col gap-5 border-y border-slate-100 py-8 md:flex-row md:items-center">
              <p className="max-w-44 text-xs leading-5 text-slate-500">
                Endorsed by the globe&apos;s leading innovative enterprises.
              </p>
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                {['IPSUM', 'Logopisum', 'Coco', 'Loco'].map((logo) => (
                  <div key={logo} className="flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-400 shadow-sm">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="bg-white">
          {/* ─── Trusted by ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-5xl text-center">
              <p className="text-lg font-bold text-slate-900">Trusted by 300K+ businesses worldwide</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {trustedLogos.map((logo) => (
                  <div key={logo} className="flex h-11 items-center justify-center rounded-full bg-white px-4 text-xs font-extrabold text-slate-500 shadow-sm ring-1 ring-slate-100">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Features (spotlight cards like dashboard) ─── */}
          <section id="features" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-2xl text-center">
              <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                Core Features
              </div>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <span className="reactbits-gradient-text">Supercharge your sales with AI Agents</span>
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Harness the power of multi-agent AI to automate your CRM, surface the best opportunities, and move every deal forward.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, label, desc }) => (
                <SpotlightCard key={label} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <div
                    className="dashboard-card-icon mb-4"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}
                  >
                    <Icon className="h-[18px] w-[18px] text-white" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                </SpotlightCard>
              ))}
            </div>

            <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-brand-500/10 ring-1 ring-slate-100">
              <img src="/hero-dashboard.png" alt="NexaCRM AI automation dashboard" className="h-auto w-full rounded-lg" />
            </div>
          </section>

          {/* ─── Collaboration ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <span className="reactbits-gradient-text">Teams that work together, win together</span>
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Multiple teams can work together inside a CRM built for collaboration, shared ownership, and faster customer outcomes.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Transparency', 'Territory Creation', '360 Customer Design'].map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600">{item}</span>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-brand-500/10 ring-1 ring-slate-100">
              <img src="/hero-dashboard.png" alt="Collaborative CRM workspace" className="h-auto w-full rounded-lg" />
            </div>
          </section>

          {/* ─── Testimonials ─── */}
          <section id="why-choose" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Staying relevant and driving innovation
              </h2>
            </div>
            <div className="mx-auto mt-9 grid max-w-6xl gap-4 md:grid-cols-4">
              {testimonials.map(([brand, quote, person], index) => (
                <SpotlightCard
                  key={brand}
                  className={`rounded-2xl border border-slate-200 p-5 text-sm ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}
                  spotlightColor={index % 2 === 0 ? 'rgba(14, 165, 233, 0.15)' : 'rgba(20, 184, 166, 0.15)'}
                >
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">{brand}</p>
                  <p className="mt-5 min-h-28 leading-6 text-slate-700">{quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-[10px] font-bold text-white">
                      {person[0]}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{person}</p>
                      <p className="text-[11px] text-slate-500">Managing Director</p>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </section>

          {/* ─── Scale your sales ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-brand-500/8 md:grid-cols-2">
              <div className="p-8 sm:p-10">
                <h2 className="text-3xl font-bold leading-tight">
                  <span className="reactbits-gradient-text">Scale your sales</span>
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Advanced workflows, cadences, and no-code functions to help you sell faster and scale efficiently.
                </p>
                <a href="#pricing" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-600">
                  Explore workflow automation <ArrowRight size={15} />
                </a>
              </div>
              <div className="bg-gradient-to-br from-brand-50 via-brand-100/50 to-accent-50 p-8">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                  {['Lead captured', 'Score updated', 'Owner assigned'].map((step, i) => (
                    <div key={step} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white shadow-sm">{i + 1}</span>
                      <span className="text-sm font-bold text-slate-700">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── 360 view ─── */}
          <section className="px-6 py-16 text-center sm:px-10 lg:px-24">
            <div className="mx-auto max-w-4xl">
              <div className="relative mx-auto h-80 max-w-3xl">
                {[1, 2, 3].map((ring) => (
                  <span key={ring} className="absolute left-1/2 top-1/2 rounded-[50%] border border-brand-300/50"
                    style={{ width: `${ring * 180}px`, height: `${ring * 92}px`, transform: 'translate(-50%, -50%) rotate(-8deg)' }} />
                ))}
                {['CRM', 'Sales', 'Support', 'Finance', 'Marketing'].map((item, i) => (
                  <span key={item} className="absolute rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-600 shadow-sm"
                    style={{ left: `${15 + i * 17}%`, top: `${28 + (i % 2) * 32}%` }}>
                    {item}
                  </span>
                ))}
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg shadow-brand-500/15 ring-1 ring-brand-100">
                  <CircleDot size={30} className="text-brand-500" />
                </span>
              </div>
              <p className="text-sm font-semibold text-brand-600">Everything your business needs,</p>
              <h2 className="mt-1 text-3xl font-bold sm:text-4xl">
                <span className="reactbits-gradient-text">with a neat 360° view.</span>
              </h2>
              <div className="mt-7 flex justify-center gap-3">
                <Link to="/register" className="rounded-full bg-brand-500 px-5 py-3 text-xs font-extrabold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600">Get Started</Link>
                <a href="#pricing" className="rounded-full bg-slate-900 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-slate-800">See Pricing</a>
              </div>
            </div>
          </section>

          {/* ─── Stats ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-5xl items-end gap-6 md:grid-cols-4">
              <div>
                <h2 className="text-3xl font-bold leading-tight text-slate-700">Grow<br />with <span className="reactbits-gradient-text">NexaCRM AI</span></h2>
              </div>
              {stats.map(([value, label]) => (
                <article key={value} className="rounded-t-full bg-gradient-to-b from-brand-50 via-brand-100/40 to-accent-50 px-6 pb-8 pt-16 text-center shadow-sm ring-1 ring-brand-100/50">
                  <strong className="text-4xl font-extrabold text-slate-900">{value}</strong>
                  <p className="mx-auto mt-2 max-w-32 text-xs font-bold text-slate-700">{label}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ─── CTA ─── */}
          <section id="testimonial" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="nexa-command-hero mx-auto max-w-5xl p-8 text-center sm:p-12">
              <div className="relative z-10">
                <h2 className="text-4xl font-bold sm:text-5xl">
                  <span className="reactbits-gradient-text">Take us for a spin!</span>
                </h2>
                <Link to="/register" className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:-translate-y-0.5 hover:bg-brand-600">
                  Get Started Free <ArrowRight size={14} />
                </Link>
                <div className="mt-9 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <img src="/hero-dashboard.png" alt="NexaCRM AI product preview" className="h-auto w-full rounded-lg" />
                </div>
              </div>
            </div>
          </section>

          {/* ─── FAQ ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-2xl font-bold text-slate-800">Frequently Asked Questions</h2>
              <div className="mt-6 space-y-3">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
                    <summary className="cursor-pointer text-sm font-bold text-slate-900 group-open:text-brand-600">{question}</summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Footer ─── */}
          <footer id="pricing" className="relative overflow-hidden bg-slate-950 px-5 pb-5 pt-10 text-slate-300 sm:px-8 lg:px-10">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(14,165,233,0.15),transparent_32%),radial-gradient(circle_at_74%_84%,rgba(20,184,166,0.12),transparent_30%)]" />
            <div className="relative mx-auto grid max-w-7xl gap-7 lg:grid-cols-[1.35fr_0.7fr_0.95fr] lg:gap-12">
              <div id="contact" className="max-w-xl">
                <Link to="/" className="inline-flex items-center gap-2.5 text-white" aria-label="Kriscel Tech home">
                  <span className="relative flex h-9 w-9 items-center justify-center">
                    <span className="absolute h-7 w-7 rotate-45 rounded-sm border-l-[3px] border-t-[3px] border-white" />
                    <span className="absolute h-5 w-5 rotate-45 rounded-sm border-l-[3px] border-t-[3px] border-white/80" />
                  </span>
                  <span className="leading-none">
                    <span className="block text-xs font-extrabold uppercase tracking-[0.16em]">Kriscel</span>
                    <span className="block text-[8px] font-bold uppercase tracking-[0.22em] text-white/60">Tech</span>
                  </span>
                </Link>
                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">
                  Business automation, digital marketing and recruitment solutions for growing enterprises. No shortcuts, no fake promises.
                </p>
                <div className="mt-6 space-y-3">
                  <a href="tel:+918985419420" className="group flex items-center gap-3 text-sm font-bold text-slate-200">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
                      <Phone size={18} />
                    </span>
                    +91 89854 19420
                  </a>
                  <a href="mailto:Info@kriscel.com" className="group flex items-center gap-3 text-sm font-bold text-slate-200">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
                      <Mail size={18} />
                    </span>
                    Info@kriscel.com
                  </a>
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-400">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-400">
                      <MapPin size={18} />
                    </span>
                    <span>229, Bharthal, Sector 26, Dwarka, South West Delhi, 110077</span>
                  </div>
                </div>
              </div>

              <nav aria-label="Footer quick links">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Quick Links</h2>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-400">
                  {quickLinks.map((item) => (
                    <li key={item}>
                      <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="transition hover:text-white">{item}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Follow Us</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                  Connect with us on our social media platforms for the latest updates in AI and automation.
                </p>
                <div className="mt-5 grid max-w-sm grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {socialLinks.map(({ label, href, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.05] px-3 text-sm font-bold text-slate-200 transition hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-white">
                      <Icon size={17} /> {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>&copy; 2026 Kriscel Tech Pvt. Ltd. All rights reserved.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <a href="#privacy" className="transition hover:text-white">Privacy Policy</a>
                <a href="#terms" className="transition hover:text-white">Terms of Service</a>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <Chatbot />

      {/* CSS animation for hero heading */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }
      `}</style>
    </main>
  )
}
