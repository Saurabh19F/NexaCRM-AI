import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  BotMessageSquare,
  BrainCircuit,
  CalendarDays,
  Camera,
  ChevronDown,
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

/* ══════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════ */

const navItems = ['Home', 'Features', 'Why Choose', 'Testimonial', 'Pricing']
const quickLinks = ['Home', 'About Us', 'Services', 'Products', 'Portfolio', 'Contact']

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: BadgeCheck },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: Camera },
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: Share2 },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: Video },
  { label: 'WhatsApp', href: 'https://wa.me/918985419420', Icon: MessageCircle },
]

const trustedLogos = ['Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta', 'Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta']

const features = [
  { icon: Users, label: 'Lead Management', desc: 'Capture, score, and route leads automatically with AI-powered insights.' },
  { icon: Kanban, label: 'Pipeline Board', desc: 'Drag-and-drop Kanban board to visualise every deal stage at a glance.' },
  { icon: BrainCircuit, label: 'AI Engine', desc: 'Smart recommendations, auto-summaries, and next-best-action prompts.' },
  { icon: MessageCircle, label: 'Communication Hub', desc: 'Unified inbox for email, WhatsApp, and call logs in one timeline.' },
  { icon: Zap, label: 'Automation', desc: 'No-code workflows that trigger tasks, emails, and follow-ups on autopilot.' },
  { icon: BarChart3, label: 'Analytics', desc: 'Real-time dashboards and conversion funnels to track what matters.' },
]

const testimonials = [
  ['ApexPrime', 'NexaCRM AI allowed us to reduce duplicated effort and improve forecasting accuracy by 40%.', 'Thomas John', 'CEO'],
  ['Global Eleva', 'Our teams got a single source of truth for every customer conversation across channels.', 'Sara Agrawal', 'VP Sales'],
  ['Minox', 'We implemented workflows faster and gave managers better visibility into the pipeline.', 'Oyin Robertson', 'CTO'],
  ['iNfoty', 'Automation helped us update high-priority accounts without manual effort or delays.', 'Ank Patel', 'Director'],
  ['TechVault', 'The AI engine surfaced opportunities we were missing — revenue grew 28% in Q1.', 'Maya Chen', 'Head of Growth'],
  ['Orbion', 'We switched from 3 tools to just NexaCRM AI. Everything is finally in one place.', 'Ravi Kumar', 'COO'],
]

const faqs = [
  ['How do I migrate to NexaCRM AI?', 'Our team helps import contacts, companies, deals, notes, and activities with guided onboarding — usually under 48 hours.'],
  ['Can teams customize pipelines?', 'Yes. You can create pipelines, fields, automations, and dashboards around your unique sales process.'],
  ['Does NexaCRM AI include AI assistance?', 'Yes. AI agents can summarize records, recommend next actions, and surface high-value opportunities automatically.'],
  ['What integrations are available?', 'We connect with email providers, WhatsApp, calendars, and popular tools through our API and native integrations.'],
]

const stats = [
  [27, '%', 'Increased productivity'],
  [50, '%', 'Faster implementation'],
  [71, '%', 'Saved on licensing fees'],
  [10, 'K+', 'Active users'],
]

const heroRotatingTexts = [
  'Boost Productivity',
  'Close More Deals',
  'Automate Workflows',
  'Grow Revenue',
]

/* ══════════════════════════════════════════════════════════
   ANIMATED COMPONENTS
   ══════════════════════════════════════════════════════════ */

/* ── BlurText (ReactBits-inspired) — chars blur-in one by one ── */
function BlurText({ text, className = '', delay = 0, staggerDelay = 30 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const chars = text.split('')

  return (
    <span ref={ref} className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(12px)', y: 8 }}
          animate={isInView ? { opacity: 1, filter: 'blur(0px)', y: 0 } : {}}
          transition={{ duration: 0.4, delay: delay + i * (staggerDelay / 1000), ease: 'easeOut' }}
          className="inline-block"
        >
          {char === ' ' ? ' ' : char}
        </motion.span>
      ))}
    </span>
  )
}

/* ── DecryptedText (ReactBits-inspired) — scramble then reveal ── */
function DecryptedText({ text, className = '', speed = 50 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  const [displayText, setDisplayText] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*'

  useEffect(() => {
    if (!isInView) return
    let revealIndex = 0
    const interval = setInterval(() => {
      if (revealIndex > text.length) {
        clearInterval(interval)
        return
      }
      const revealed = text.slice(0, revealIndex)
      const scrambled = Array.from({ length: Math.min(3, text.length - revealIndex) }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('')
      setDisplayText(revealed + scrambled)
      revealIndex++
    }, speed)
    return () => clearInterval(interval)
  }, [isInView, text, speed])

  return <span ref={ref} className={className}>{displayText || ' '}</span>
}

/* ── CountUp — animated number counter ── */
function CountUp({ end, suffix = '', duration = 2000 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const startTime = performance.now()
    const tick = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setValue(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, end, duration])

  return <span ref={ref}>{value}{suffix}</span>
}

/* ── Rotating Text Loop (Good Components-inspired) ── */
function RotatingText({ texts, className = '' }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % texts.length), 3000)
    return () => clearInterval(timer)
  }, [texts.length])

  return (
    <span className={`inline-block relative overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          initial={{ y: '100%', opacity: 0, rotateX: -90 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          exit={{ y: '-100%', opacity: 0, rotateX: 90 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="inline-block reactbits-gradient-text"
        >
          {texts[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/* ── Magnetic Button (Good Components-inspired) ── */
function MagneticButton({ children, className = '', ...props }) {
  const btnRef = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setOffset({ x: (e.clientX - cx) * 0.25, y: (e.clientY - cy) * 0.25 })
  }

  return (
    <motion.div
      ref={btnRef}
      onMouseMove={handleMouse}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.5 }}
      className="inline-block"
    >
      <Link className={className} {...props}>
        {children}
      </Link>
    </motion.div>
  )
}

function MagneticAnchor({ children, className = '', href = '#', onClick, ...props }) {
  const btnRef = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMouse = (e) => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    setOffset({ x: (e.clientX - cx) * 0.25, y: (e.clientY - cy) * 0.25 })
  }

  return (
    <motion.div
      ref={btnRef}
      onMouseMove={handleMouse}
      onMouseLeave={() => setOffset({ x: 0, y: 0 })}
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 200, damping: 15, mass: 0.5 }}
      className="inline-block"
    >
      <a href={href} onClick={onClick} className={className} {...props}>
        {children}
      </a>
    </motion.div>
  )
}

/* ── TiltedCard (ReactBits-inspired) — 3D perspective tilt ── */
function TiltedCard({ children, className = '' }) {
  const cardRef = useRef(null)
  const [transform, setTransform] = useState('')

  const handleMouse = (e) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    setTransform(`perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.02,1.02,1.02)`)
  }

  return (
    <div
      ref={cardRef}
      className={className}
      onMouseMove={handleMouse}
      onMouseLeave={() => setTransform('')}
      style={{ transform, transition: 'transform 0.15s ease-out' }}
    >
      {children}
    </div>
  )
}

/* ── Infinite Logo Ticker (Good Components-inspired) ── */
function LogoTicker({ items }) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
      <div className="landing-ticker-track flex w-max gap-6">
        {[...items, ...items].map((logo, i) => (
          <div key={i} className="flex h-12 min-w-[120px] items-center justify-center rounded-full bg-white px-5 text-xs font-extrabold text-slate-400 shadow-sm ring-1 ring-slate-100">
            {logo}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Infinite Testimonial Wall (Good Components-inspired) ── */
function TestimonialWall({ items }) {
  const half = Math.ceil(items.length / 2)
  const row1 = items.slice(0, half)
  const row2 = items.slice(half)

  const Card = ({ brand, quote, person, role }) => (
    <TiltedCard className="min-w-[280px] max-w-[320px] shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-400">{brand}</p>
      <p className="mt-4 text-sm leading-6 text-slate-600">{quote}</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white">
          {person[0]}
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">{person}</p>
          <p className="text-[11px] text-slate-500">{role}</p>
        </div>
      </div>
    </TiltedCard>
  )

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="landing-scroll-left flex gap-4">
        {[...row1, ...row1, ...row1].map(([brand, quote, person, role], i) => (
          <Card key={i} brand={brand} quote={quote} person={person} role={role} />
        ))}
      </div>
      <div className="landing-scroll-right flex gap-4">
        {[...row2, ...row2, ...row2].map(([brand, quote, person, role], i) => (
          <Card key={i} brand={brand} quote={quote} person={person} role={role} />
        ))}
      </div>
    </div>
  )
}

/* ── SpotlightCard (same as dashboard) ── */
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

/* ── Floating Particles (Spline-inspired 3D feel) ── */
function FloatingParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: 3 + (i % 4) * 2,
      left: `${(i * 5.26) % 100}%`,
      top: `${(i * 7.14 + 10) % 100}%`,
      delay: `${(i * 0.8) % 6}s`,
      duration: `${12 + (i % 5) * 4}s`,
      opacity: 0.15 + (i % 3) * 0.1,
    })), [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full landing-particle"
          style={{
            width: p.size, height: p.size,
            left: p.left, top: p.top,
            background: p.id % 2 === 0 ? 'rgba(14,165,233,0.4)' : 'rgba(20,184,166,0.4)',
            opacity: p.opacity,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  )
}

/* ── 3D Orb (Spline-inspired) ── */
function GlassOrb() {
  return (
    <div className="absolute -right-20 top-16 hidden xl:block pointer-events-none" aria-hidden="true">
      <div className="landing-3d-orb">
        <div className="landing-3d-orb__inner" />
        <div className="landing-3d-orb__ring" />
        <div className="landing-3d-orb__ring landing-3d-orb__ring--2" />
      </div>
    </div>
  )
}

/* ── Scroll-triggered section wrapper ── */
function ScrollReveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* ── Image Reveal (Skiper UI-inspired) ── */
function ImageReveal({ src, alt, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        initial={{ scaleX: 1 }}
        animate={isInView ? { scaleX: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
        className="absolute inset-0 z-10 origin-right bg-gradient-to-r from-brand-100 to-accent-100"
      />
      <motion.img
        src={src}
        alt={alt}
        initial={{ scale: 1.2 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full w-full object-cover object-top"
      />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   CHATBOT
   ══════════════════════════════════════════════════════════ */

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
      <AnimatePresence>
        {isOpen && (
          <motion.section
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            aria-label="AI chat"
            className="w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[390px]"
          >
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
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((c) => !c)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] transition"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
          <BotMessageSquare size={18} strokeWidth={2.1} />
        </span>
        <span className="hidden pr-1 sm:inline">AI Chat</span>
      </motion.button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   MOBILE NAV
   ══════════════════════════════════════════════════════════ */

function MobileNav({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}
          />
          <motion.nav
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 250 }}
            className="absolute right-0 top-0 flex h-full w-64 flex-col gap-1 bg-white p-6 shadow-xl"
          >
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
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  )
}

/* ══════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const [mobileNav, setMobileNav] = useState(false)

  return (
    <main className="bg-white text-slate-900 font-sans antialiased">
      <div className="mx-auto max-w-7xl bg-white">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden px-5 pt-5 sm:px-8 lg:px-16">
          {/* Aurora background */}
          <div className="absolute inset-x-0 top-0 h-[700px] overflow-hidden">
            <div className="reactbits-aurora absolute inset-0" />
            <div className="reactbits-aurora__band reactbits-aurora__band--one absolute inset-0" />
            <div className="reactbits-aurora__band reactbits-aurora__band--two absolute inset-0" />
            <FloatingParticles />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="relative z-10">
            {/* Navbar */}
            <motion.header
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="sticky top-4 z-30 mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/70 px-3.5 py-2 shadow-[0_10px_28px_rgba(14,165,233,0.08)] backdrop-blur-2xl"
            >
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
            </motion.header>

            <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />

            {/* Hero content */}
            <div id="home" className="relative mx-auto max-w-3xl pb-6 pt-14 text-center sm:pt-16">
              <GlassOrb />

              {/* Signal pill */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="nexa-signal-pill mx-auto mb-5 w-fit"
              >
                <Radio className="h-3.5 w-3.5" />
                AI-Powered CRM Platform
              </motion.div>

              {/* Heading with BlurText + Rotating Text */}
              <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-[1.12] sm:text-4xl lg:text-[44px]">
                <BlurText text="Simplify CRM Management" className="block" />
                <RotatingText texts={heroRotatingTexts} className="mt-1 h-[1.2em]" />
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-600"
              >
                Easily manage leads, customers, and sales activity from first touch to closed deal — powered by intelligent automation.
              </motion.p>

              {/* CTA with magnetic effect */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
              >
                <MagneticButton
                  to="/register"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/35"
                >
                  Get Started Free <ArrowRight size={15} />
                </MagneticButton>
                <MagneticAnchor
                  href="#testimonial"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 transition hover:border-brand-300 hover:text-brand-600"
                >
                  Book a Demo <CalendarDays size={15} />
                </MagneticAnchor>
              </motion.div>

              {/* Orbit tiles */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                className="mt-7 flex flex-wrap justify-center gap-2"
              >
                {[
                  { label: 'Live Signal', icon: Radio, tone: 'emerald' },
                  { label: 'AI Assist', icon: BrainCircuit, tone: 'cyan' },
                  { label: 'Secure CRM', icon: ShieldCheck, tone: 'violet' },
                ].map(({ label, icon: Icon, tone }) => (
                  <motion.div
                    key={label}
                    whileHover={{ scale: 1.08, y: -2 }}
                    className={`nexa-orbit-tile nexa-orbit-tile--${tone}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero dashboard image with reveal */}
            <ScrollReveal className="relative mx-auto mt-2 max-w-4xl pb-10">
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-xl shadow-brand-500/10 ring-4 ring-white/50">
                <ImageReveal src="/hero-dashboard.png" alt="NexaCRM AI dashboard overview" className="h-[190px] sm:h-[250px] lg:h-[320px]" />
              </div>
            </ScrollReveal>

            {/* Infinite logo ticker */}
            <ScrollReveal className="mx-auto max-w-5xl border-y border-slate-100 py-8">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Endorsed by innovative enterprises
              </p>
              <LogoTicker items={trustedLogos} />
            </ScrollReveal>
          </div>
        </section>

        <div className="bg-white">

          {/* ═══ FEATURES ═══ */}
          <section id="features" className="px-6 py-20 sm:px-10 lg:px-24">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                Core Features
              </div>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <DecryptedText text="Supercharge your sales with AI Agents" className="reactbits-gradient-text" speed={35} />
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Harness the power of multi-agent AI to automate your CRM, surface the best opportunities, and move every deal forward.
              </p>
            </ScrollReveal>

            <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, label, desc }, i) => (
                <ScrollReveal key={label} delay={i * 0.08}>
                  <TiltedCard>
                    <SpotlightCard className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                      <div
                        className="dashboard-card-icon mb-4"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)' }}
                      >
                        <Icon className="h-[18px] w-[18px] text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                    </SpotlightCard>
                  </TiltedCard>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.2} className="mx-auto mt-12 max-w-3xl">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-brand-500/10 ring-1 ring-slate-100">
                <ImageReveal src="/hero-dashboard.png" alt="NexaCRM AI automation dashboard" className="h-auto w-full rounded-lg" />
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ COLLABORATION ═══ */}
          <section className="px-6 py-20 sm:px-10 lg:px-24">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <span className="reactbits-gradient-text">Teams that work together, win together</span>
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Multiple teams can work together inside a CRM built for collaboration, shared ownership, and faster customer outcomes.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {['Transparency', 'Territory Creation', '360 Customer Design'].map((item, i) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="rounded-full border border-slate-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600"
                  >
                    {item}
                  </motion.span>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15} className="mx-auto mt-10 max-w-5xl">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-brand-500/10 ring-1 ring-slate-100">
                <ImageReveal src="/hero-dashboard.png" alt="Collaborative CRM workspace" className="h-auto w-full rounded-lg" />
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ TESTIMONIALS — infinite scroll wall ═══ */}
          <section id="why-choose" className="py-20 overflow-hidden">
            <ScrollReveal className="mx-auto max-w-3xl px-6 text-center">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                <BlurText text="Staying relevant and driving innovation" />
              </h2>
              <p className="mt-3 text-sm text-slate-500">See what our customers are saying</p>
            </ScrollReveal>

            <div className="mt-10">
              <TestimonialWall items={testimonials} />
            </div>
          </section>

          {/* ═══ SCALE YOUR SALES ═══ */}
          <section className="px-6 py-20 sm:px-10 lg:px-24">
            <ScrollReveal>
              <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-brand-500/8 md:grid-cols-2">
                <div className="p-8 sm:p-10">
                  <h2 className="text-3xl font-bold leading-tight">
                    <span className="reactbits-gradient-text">Scale your sales</span>
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Advanced workflows, cadences, and no-code functions to help you sell faster and scale efficiently.
                  </p>
                  <MagneticAnchor
                    href="#pricing"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-600"
                  >
                    Explore workflow automation <ArrowRight size={15} />
                  </MagneticAnchor>
                </div>
                <div className="bg-gradient-to-br from-brand-50 via-brand-100/50 to-accent-50 p-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                    {['Lead captured', 'Score updated', 'Owner assigned'].map((step, i) => (
                      <motion.div
                        key={step}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.15 }}
                        className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white shadow-sm">{i + 1}</span>
                        <span className="text-sm font-bold text-slate-700">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ 360° VIEW ═══ */}
          <section className="px-6 py-20 text-center sm:px-10 lg:px-24">
            <ScrollReveal className="mx-auto max-w-4xl">
              <div className="relative mx-auto h-80 max-w-3xl">
                {[1, 2, 3].map((ring) => (
                  <motion.span
                    key={ring}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: ring * 0.15, duration: 0.6 }}
                    className="absolute left-1/2 top-1/2 rounded-[50%] border border-brand-300/50"
                    style={{ width: `${ring * 180}px`, height: `${ring * 92}px`, transform: 'translate(-50%, -50%) rotate(-8deg)' }}
                  />
                ))}
                {['CRM', 'Sales', 'Support', 'Finance', 'Marketing'].map((item, i) => (
                  <motion.span
                    key={item}
                    initial={{ opacity: 0, scale: 0 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.1, type: 'spring', stiffness: 200 }}
                    whileHover={{ scale: 1.12, y: -3 }}
                    className="absolute rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-600 shadow-sm cursor-default"
                    style={{ left: `${15 + i * 17}%`, top: `${28 + (i % 2) * 32}%` }}
                  >
                    {item}
                  </motion.span>
                ))}
                <motion.span
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-lg shadow-brand-500/15 ring-1 ring-brand-100"
                >
                  <CircleDot size={30} className="text-brand-500" />
                </motion.span>
              </div>
              <p className="text-sm font-semibold text-brand-600">Everything your business needs,</p>
              <h2 className="mt-1 text-3xl font-bold sm:text-4xl">
                <span className="reactbits-gradient-text">with a neat 360° view.</span>
              </h2>
              <div className="mt-7 flex justify-center gap-3">
                <MagneticButton to="/register" className="rounded-full bg-brand-500 px-5 py-3 text-xs font-extrabold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600">
                  Get Started
                </MagneticButton>
                <MagneticAnchor href="#pricing" className="rounded-full bg-slate-900 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-slate-800">
                  See Pricing
                </MagneticAnchor>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ STATS with CountUp ═══ */}
          <section className="px-6 py-20 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-5xl items-end gap-6 md:grid-cols-5">
              <ScrollReveal className="md:col-span-1">
                <h2 className="text-3xl font-bold leading-tight text-slate-700">Grow<br />with <span className="reactbits-gradient-text">NexaCRM AI</span></h2>
              </ScrollReveal>
              {stats.map(([value, suffix, label], i) => (
                <ScrollReveal key={label} delay={i * 0.1}>
                  <article className="rounded-t-full bg-gradient-to-b from-brand-50 via-brand-100/40 to-accent-50 px-6 pb-8 pt-16 text-center shadow-sm ring-1 ring-brand-100/50">
                    <strong className="text-4xl font-extrabold text-slate-900">
                      <CountUp end={value} suffix={suffix} />
                    </strong>
                    <p className="mx-auto mt-2 max-w-32 text-xs font-bold text-slate-700">{label}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ═══ CTA ═══ */}
          <section id="testimonial" className="px-6 py-20 sm:px-10 lg:px-24">
            <ScrollReveal>
              <div className="nexa-command-hero mx-auto max-w-5xl p-8 text-center sm:p-12">
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold sm:text-5xl">
                    <BlurText text="Take us for a spin!" className="reactbits-gradient-text" />
                  </h2>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="mt-5"
                  >
                    <MagneticButton to="/register" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600">
                      Get Started Free <ArrowRight size={14} />
                    </MagneticButton>
                  </motion.div>
                  <ScrollReveal delay={0.2} className="mt-9">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <ImageReveal src="/hero-dashboard.png" alt="NexaCRM AI product preview" className="h-auto w-full rounded-lg" />
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="px-6 py-20 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-5xl">
              <ScrollReveal>
                <h2 className="text-2xl font-bold text-slate-800">
                  <DecryptedText text="Frequently Asked Questions" speed={40} />
                </h2>
              </ScrollReveal>
              <div className="mt-6 space-y-3">
                {faqs.map(([question, answer], i) => (
                  <ScrollReveal key={question} delay={i * 0.08}>
                    <details className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md">
                      <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-slate-900 group-open:text-brand-600">
                        {question}
                        <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform group-open:rotate-180 group-open:text-brand-500" />
                      </summary>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{answer}</p>
                    </details>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
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

      {/* Landing page animations */}
      <style>{`
        /* BlurText fadeInUp fallback */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0);   }
        }

        /* Infinite logo ticker */
        @keyframes landingTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .landing-ticker-track {
          animation: landingTickerScroll 30s linear infinite;
        }
        .landing-ticker-track:hover {
          animation-play-state: paused;
        }

        /* Testimonial wall scroll */
        @keyframes landingScrollLeft {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        @keyframes landingScrollRight {
          0%   { transform: translateX(-33.33%); }
          100% { transform: translateX(0); }
        }
        .landing-scroll-left {
          animation: landingScrollLeft 40s linear infinite;
        }
        .landing-scroll-right {
          animation: landingScrollRight 40s linear infinite;
        }
        .landing-scroll-left:hover,
        .landing-scroll-right:hover {
          animation-play-state: paused;
        }

        /* Floating particles */
        @keyframes landingFloat {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: var(--p-opacity, 0.2); }
          25%      { transform: translate(12px, -18px) scale(1.3); opacity: calc(var(--p-opacity, 0.2) * 1.5); }
          50%      { transform: translate(-8px, -30px) scale(0.8); opacity: var(--p-opacity, 0.2); }
          75%      { transform: translate(15px, -12px) scale(1.1); opacity: calc(var(--p-opacity, 0.2) * 1.3); }
        }
        .landing-particle {
          animation: landingFloat 14s ease-in-out infinite;
        }

        /* 3D Glass Orb (Spline-inspired) */
        .landing-3d-orb {
          position: relative;
          width: 180px;
          height: 180px;
        }
        .landing-3d-orb__inner {
          position: absolute;
          inset: 20px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(14,165,233,0.4), rgba(20,184,166,0.2) 50%, rgba(99,102,241,0.15) 80%, transparent);
          box-shadow: inset 0 0 30px rgba(14,165,233,0.2), 0 0 60px rgba(14,165,233,0.15);
          animation: landingOrbPulse 4s ease-in-out infinite;
        }
        .landing-3d-orb__ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1.5px solid rgba(14,165,233,0.2);
          animation: landingOrbSpin 12s linear infinite;
        }
        .landing-3d-orb__ring--2 {
          inset: 10px;
          border-color: rgba(20,184,166,0.15);
          animation-duration: 18s;
          animation-direction: reverse;
        }
        @keyframes landingOrbPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%      { transform: scale(1.05); opacity: 1; }
        }
        @keyframes landingOrbSpin {
          0%   { transform: rotateX(60deg) rotateZ(0deg); }
          100% { transform: rotateX(60deg) rotateZ(360deg); }
        }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .landing-ticker-track,
          .landing-scroll-left,
          .landing-scroll-right,
          .landing-particle,
          .landing-3d-orb__inner,
          .landing-3d-orb__ring {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  )
}
