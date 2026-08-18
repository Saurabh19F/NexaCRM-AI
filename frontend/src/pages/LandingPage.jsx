import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  CircleDot,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Share2,
  Sparkles,
  Video,
  X,
  Bot,
  BotMessageSquare,
  Loader2,
  Send,
} from 'lucide-react'

/* ── Data ──────────────────────────────────────────────── */

const navItems = ['Home', 'Features', 'Why Choose', 'Testimonial', 'Pricing']

const logos = ['IPSUM', 'Logopisum', 'Coco', 'Loco']

const quickLinks = ['Home', 'About Us', 'Services', 'Products', 'Portfolio', 'Contact']

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: BadgeCheck },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: Camera },
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: Share2 },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: Video },
  { label: 'WhatsApp', href: 'https://wa.me/918985419420', Icon: MessageCircle },
]

const trustedLogos = ['Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta']

const testimonials = [
  ['ApexPrime', 'NexaCRM allowed us to reduce duplicated effort and improve forecasting.', 'Thomas John'],
  ['Global Eleva', 'Our teams got a single source of truth for every customer conversation.', 'Sara Agrawal'],
  ['Minox', 'We implemented workflows faster and gave managers better visibility.', 'Oyin Robertson'],
  ['iNfoty', 'Automation helped us update high-priority accounts without manual effort.', 'Ank Patel'],
]

const faqs = [
  ['How do I migrate to NexaCRM?', 'Our team helps import contacts, companies, deals, notes, and activities with guided onboarding.'],
  ['Can teams customize pipelines?', 'Yes. You can create pipelines, fields, automations, and dashboards around your sales process.'],
  ['Does NexaCRM include AI assistance?', 'Yes. AI agents can summarize records, recommend next actions, and surface high-value opportunities.'],
]

const stats = [
  ['27%', 'Increased productivity'],
  ['50%', 'Faster implementation'],
  ['71%', 'Saved on licensing fees'],
]

/* ── Animated hero heading (CSS-only, no GSAP) ─────────── */

function AnimatedHeading({ text }) {
  const words = text.split(' ')
  return (
    <h1 className="mx-auto max-w-2xl text-3xl font-extrabold leading-[1.08] text-slate-950 sm:text-4xl lg:text-[44px]">
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block animate-[fadeInUp_0.7s_ease-out_both]"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </h1>
  )
}

/* ── Mini avatar ───────────────────────────────────────── */

function MiniAvatar({ className = '' }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-violet-200 text-[10px] font-bold text-violet-800 ${className}`}>
      T
    </span>
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
        <section aria-label="AI chat" className="w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#060b20] text-white shadow-2xl shadow-slate-950/30 sm:w-[390px]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b1230] px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#3c91ff] text-white">
                <Bot size={21} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-extrabold">Kriscel AI Assistant</h2>
                <p className="text-xs text-[#9cb8e8]">Powered by AI</p>
              </div>
            </div>
            <button type="button" aria-label="Close chat" onClick={() => setIsOpen(false)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/[0.12]">
              <X size={18} />
            </button>
          </div>

          <div className="flex max-h-[360px] min-h-[300px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'rounded-br-md bg-[#3c91ff] text-white'
                    : 'rounded-bl-md border border-white/10 bg-white/[0.07] text-[#dbe9ff]'
                }`}>
                  {msg.content}
                </p>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.07] px-4 py-3 text-sm text-[#dbe9ff]">
                  <Loader2 size={16} className="animate-spin" /> Thinking
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-white/10 bg-[#0b1230] p-4">
            <label className="sr-only" htmlFor="chat-msg">Message</label>
            <textarea
              id="chat-msg" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
              placeholder="Type your message..." rows={1}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-white/10 bg-white px-3 py-3 text-sm leading-5 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#3c91ff]"
            />
            <button type="submit" disabled={isSending || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#3c91ff] text-white transition hover:bg-[#1f7bf0] disabled:cursor-not-allowed disabled:bg-slate-500">
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </section>
      )}

      <button type="button" onClick={() => setIsOpen((c) => !c)}
        className="group inline-flex h-12 items-center gap-2.5 rounded-full border border-cyan-200/55 bg-[#00a8b8] px-3.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,168,184,0.24)] transition hover:-translate-y-0.5 hover:bg-[#0891b2] sm:px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/20">
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
            className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            {item}
          </a>
        ))}
        <div className="mt-4 space-y-2">
          <Link to="/login" className="block rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50">Login</Link>
          <a href="#contact" onClick={onClose} className="block rounded-full bg-[#00a8b8] px-4 py-2 text-center text-sm font-semibold text-white hover:bg-[#0891b2]">Contact Us</a>
        </div>
      </nav>
    </div>
  )
}

/* ── Landing Page ──────────────────────────────────────── */

export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <main className="bg-white text-slate-950">
      <div className="mx-auto max-w-7xl bg-white">
        {/* ─── Hero ─── */}
        <section className="relative overflow-hidden px-5 pt-5 sm:px-8 lg:px-16">
          <div className="absolute inset-x-0 top-0 h-[560px] overflow-hidden">
            <img src="/hero-clouds.png" alt="" className="h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-white/10" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,#ffffff_82%)]" />
          </div>

          <div className="relative z-10">
            {/* Navbar */}
            <header className="sticky top-4 z-30 mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-white/70 bg-white/55 px-3.5 py-2 shadow-[0_10px_28px_rgba(79,70,229,0.08)] backdrop-blur-2xl">
              <Link to="/" className="group flex min-w-0 items-center gap-3 rounded-full pr-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#20c7d4,#0ea5e9)] text-white shadow-sm shadow-cyan-300/40 transition group-hover:scale-105">
                  <Sparkles size={14} strokeWidth={2.4} />
                </span>
                <span className="text-[15px] font-extrabold tracking-tight text-slate-950">NexaCRM</span>
              </Link>

              <nav aria-label="Primary" className="hidden items-center gap-1 text-[12px] font-semibold text-slate-600 lg:flex">
                {navItems.map((item) => (
                  <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                    className={`rounded-full px-3 py-1.5 transition ${item === 'Home' ? 'bg-white/70 text-slate-950 shadow-sm' : 'hover:bg-white/55 hover:text-slate-950'}`}>
                    {item}
                  </a>
                ))}
              </nav>

              <div className="flex items-center gap-2">
                <Link to="/login" className="hidden h-8 items-center justify-center rounded-full border border-white/70 bg-white/65 px-4 text-[11px] font-semibold text-slate-900 shadow-sm transition hover:bg-white sm:inline-flex">Login</Link>
                <a href="#contact" className="hidden h-8 items-center justify-center gap-1.5 rounded-full bg-[#00a8b8] px-4 text-[11px] font-semibold text-white shadow-sm shadow-cyan-700/15 transition hover:bg-[#0891b2] sm:inline-flex">
                  Contact Us <ArrowRight size={12} />
                </a>
                <button aria-label="Open menu" onClick={() => setMobileNav(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/60 text-slate-900 shadow-sm backdrop-blur-xl transition hover:bg-white lg:hidden">
                  <Menu size={16} />
                </button>
              </div>
            </header>

            <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />

            {/* Hero content */}
            <div id="home" className="relative mx-auto max-w-3xl pb-6 pt-12 text-center sm:pt-14">
              <AnimatedHeading text="Simplify CRM Management Boost Productivity" />
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
                Easily manage leads, customers, and sales activity from first touch to closed deal.
              </p>
              <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to="/register" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#00a8b8] px-5 text-sm font-bold text-white shadow-lg shadow-cyan-300 transition hover:bg-[#0891b2]">
                  Get Started Free <ArrowRight size={15} />
                </Link>
                <a href="#testimonial" className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white/80 px-5 text-sm font-bold text-slate-950 transition hover:border-cyan-300 hover:text-cyan-700">
                  Book a Demo <CalendarDays size={15} />
                </a>
              </div>
            </div>

            {/* Hero dashboard image */}
            <div className="relative mx-auto mt-2 max-w-4xl pb-10">
              <div className="overflow-hidden rounded-xl border border-white/80 bg-white shadow-xl shadow-cyan-200/40 ring-4 ring-white/50">
                <div className="relative h-[190px] sm:h-[250px] lg:h-[320px]">
                  <img src="/hero-dashboard.png" alt="CRM dashboard overview" className="h-full w-full object-cover object-top" />
                </div>
              </div>
            </div>

            {/* Logo bar */}
            <div className="mx-auto flex max-w-5xl flex-col gap-5 border-y border-slate-100 py-8 md:flex-row md:items-center">
              <p className="max-w-44 text-xs leading-5 text-slate-500">
                Endorsed by the globe&apos;s leading innovative enterprises.
              </p>
              <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
                {logos.map((logo) => (
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
              <p className="text-lg font-bold text-slate-950">Trusted by 300K+ businesses worldwide</p>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {trustedLogos.map((logo) => (
                  <div key={logo} className="flex h-11 items-center justify-center rounded-full bg-white px-4 text-xs font-extrabold text-slate-500 shadow-sm ring-1 ring-black/5">
                    {logo}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Features ─── */}
          <section id="features" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#00a8b8] shadow-sm">
                <Sparkles size={19} />
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                Supercharge your sales with AI Agents
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Harness the power of multi-agent AI to automate your CRM, surface the best opportunities, and move every deal forward.
              </p>
              <a href="#ai-agents" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#008fa0]">
                Explore agents <ArrowRight size={15} />
              </a>
            </div>
            <div className="mx-auto mt-9 max-w-3xl overflow-hidden rounded-xl bg-white p-2 shadow-xl shadow-cyan-100/70 ring-1 ring-black/5">
              <img src="/hero-dashboard.png" alt="CRM automation dashboard" className="h-auto w-full rounded-lg" />
            </div>
          </section>

          {/* ─── Collaboration ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-extrabold leading-tight text-[#0074ff] sm:text-4xl">
                Teams that work together, win together
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Multiple teams can work together inside a CRM built for collaboration, shared ownership, and faster customer outcomes.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Transparency', 'Territory Creation', '360 Customer Design'].map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-black/5">{item}</span>
                ))}
              </div>
            </div>
            <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-xl bg-white p-2 shadow-xl shadow-cyan-100/70 ring-1 ring-black/5">
              <img src="/hero-dashboard.png" alt="Collaborative CRM workspace" className="h-auto w-full rounded-lg" />
            </div>
          </section>

          {/* ─── Testimonials ─── */}
          <section id="why-choose" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-2xl font-extrabold text-slate-950 sm:text-3xl">
                Staying relevant and driving innovation, since 2005
              </h2>
            </div>
            <div className="mx-auto mt-9 grid max-w-6xl gap-4 md:grid-cols-4">
              {testimonials.map(([brand, quote, person], index) => (
                <article key={brand} className={`rounded-2xl p-5 text-sm shadow-sm ring-1 ring-black/5 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                  <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">{brand}</p>
                  <p className="mt-5 min-h-28 leading-6 text-slate-700">{quote}</p>
                  <div className="mt-6 flex items-center gap-3">
                    <MiniAvatar className="bg-cyan-100 text-cyan-700" />
                    <div>
                      <p className="text-xs font-bold text-slate-950">{person}</p>
                      <p className="text-[11px] text-slate-500">Managing Director</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* ─── Scale your sales ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-cyan-100/70 ring-1 ring-slate-100 md:grid-cols-2">
              <div className="p-8 sm:p-10">
                <h2 className="text-3xl font-extrabold leading-tight text-[#0074ff]">Scale your sales</h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Advanced workflows, cadences, and no-code functions to help you sell faster and scale efficiently.
                </p>
                <a href="#pricing" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#008fa0]">
                  Explore workflow automation <ArrowRight size={15} />
                </a>
              </div>
              <div className="bg-[linear-gradient(135deg,#e5fbff,#b99cff)] p-8">
                <div className="rounded-2xl bg-white p-5 shadow-lg">
                  {['Lead captured', 'Score updated', 'Owner assigned'].map((step, i) => (
                    <div key={step} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#00a8b8] text-xs font-bold text-white">{i + 1}</span>
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
                  <span key={ring} className="absolute left-1/2 top-1/2 rounded-[50%] border border-[#5aa7ff]/70"
                    style={{ width: `${ring * 180}px`, height: `${ring * 92}px`, transform: 'translate(-50%, -50%) rotate(-8deg)' }} />
                ))}
                {['CRM', 'Sales', 'Support', 'Finance', 'Marketing'].map((item, i) => (
                  <span key={item} className="absolute rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0074ff] shadow-sm ring-1 ring-blue-100"
                    style={{ left: `${15 + i * 17}%`, top: `${28 + (i % 2) * 32}%` }}>
                    {item}
                  </span>
                ))}
                <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-blue-100">
                  <CircleDot size={30} className="text-[#00a8b8]" />
                </span>
              </div>
              <p className="text-sm font-semibold text-[#0074ff]">Everything your business needs,</p>
              <h2 className="mt-1 text-3xl font-extrabold text-[#0074ff] sm:text-4xl">with a neat 360° view.</h2>
              <div className="mt-7 flex justify-center gap-3">
                <Link to="/register" className="rounded-full bg-red-500 px-5 py-3 text-xs font-extrabold text-white">Get Started</Link>
                <a href="#pricing" className="rounded-full bg-slate-950 px-5 py-3 text-xs font-extrabold text-white">See Pricing</a>
              </div>
            </div>
          </section>

          {/* ─── Stats ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-5xl items-end gap-6 md:grid-cols-4">
              <div>
                <h2 className="text-3xl font-extrabold leading-tight text-slate-700">Grow<br />with NexaCRM</h2>
              </div>
              {stats.map(([value, label]) => (
                <article key={value} className="rounded-t-full bg-[linear-gradient(180deg,#ccfbf1,#e9d5ff)] px-6 pb-8 pt-16 text-center shadow-sm">
                  <strong className="text-4xl font-extrabold text-slate-950">{value}</strong>
                  <p className="mx-auto mt-2 max-w-32 text-xs font-bold text-slate-700">{label}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ─── CTA ─── */}
          <section id="testimonial" className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#f8fdff,#e6fbff)] p-8 text-center shadow-xl shadow-cyan-100/70 ring-1 ring-slate-100 sm:p-12">
              <h2 className="text-4xl font-extrabold text-[#0074ff] sm:text-5xl">Take us for a spin!</h2>
              <a href="#contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 text-xs font-extrabold text-white">
                Watch overview <ArrowRight size={14} />
              </a>
              <div className="mt-9 overflow-hidden rounded-xl bg-white p-2 shadow-lg">
                <img src="/hero-dashboard.png" alt="CRM product preview" className="h-auto w-full rounded-lg" />
              </div>
            </div>
          </section>

          {/* ─── FAQ ─── */}
          <section className="px-6 py-16 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-2xl font-extrabold text-slate-800">Frequently Asked Questions</h2>
              <div className="mt-6 space-y-3">
                {faqs.map(([question, answer]) => (
                  <details key={question} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                    <summary className="cursor-pointer text-sm font-extrabold text-slate-900">{question}</summary>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* ─── Footer ─── */}
          <footer id="pricing" className="relative overflow-hidden bg-[#030719] px-5 pb-5 pt-10 text-[#c7ddff] sm:px-8 lg:px-10">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(0,168,184,0.2),transparent_32%),radial-gradient(circle_at_74%_84%,rgba(8,145,178,0.18),transparent_30%)]" />
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
                <p className="mt-5 max-w-xl text-sm leading-6 text-[#a9c8f6]">
                  Business automation, digital marketing and recruitment solutions for growing enterprises. No shortcuts, no fake promises.
                </p>
                <div className="mt-6 space-y-3">
                  <a href="tel:+918985419420" className="group flex items-center gap-3 text-sm font-bold text-[#e6f0ff]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[#00a8b8] transition group-hover:border-[#00a8b8]/60 group-hover:bg-[#00a8b8]/10">
                      <Phone size={18} />
                    </span>
                    +91 89854 19420
                  </a>
                  <a href="mailto:Info@kriscel.com" className="group flex items-center gap-3 text-sm font-bold text-[#e6f0ff]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[#00a8b8] transition group-hover:border-[#00a8b8]/60 group-hover:bg-[#00a8b8]/10">
                      <Mail size={18} />
                    </span>
                    Info@kriscel.com
                  </a>
                  <div className="flex items-start gap-3 text-sm leading-6 text-[#a9c8f6]">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[#00a8b8]">
                      <MapPin size={18} />
                    </span>
                    <span>229, Bharthal, Sector 26, Dwarka, South West Delhi, 110077</span>
                  </div>
                </div>
              </div>

              <nav aria-label="Footer quick links">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Quick Links</h2>
                <ul className="mt-4 space-y-2.5 text-sm text-[#a9c8f6]">
                  {quickLinks.map((item) => (
                    <li key={item}>
                      <a href={`#${item.toLowerCase().replaceAll(' ', '-')}`} className="transition hover:text-white">{item}</a>
                    </li>
                  ))}
                </ul>
              </nav>

              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Follow Us</h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-[#a9c8f6]">
                  Connect with us on our social media platforms for the latest updates in AI and automation.
                </p>
                <div className="mt-5 grid max-w-sm grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {socialLinks.map(({ label, href, Icon }) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.07] px-3 text-sm font-bold text-[#e6f0ff] transition hover:border-[#00a8b8]/60 hover:bg-[#00a8b8]/10">
                      <Icon size={17} /> {label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-5 text-xs text-[#7f9aca] md:flex-row md:items-center md:justify-between">
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
