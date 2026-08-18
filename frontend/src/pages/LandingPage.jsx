import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Bot,
  BotMessageSquare,
  BrainCircuit,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  CircleDot,
  Crown,
  Globe,
  Kanban,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Play,
  Radio,
  Rocket,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  Video,
  Wand2,
  X,
  Zap,
} from 'lucide-react'

/* ══════════════════════════════════════════════════════════
   DATA
   ══════════════════════════════════════════════════════════ */

const navItems = ['Home', 'Features', 'Pricing', 'Testimonial', 'Contact']
const quickLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonial' },
  { label: 'Contact', href: '#contact' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Service', href: '/terms' },
]

const socialLinks = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com', Icon: BadgeCheck },
  { label: 'Instagram', href: 'https://www.instagram.com', Icon: Camera },
  { label: 'Facebook', href: 'https://www.facebook.com', Icon: Share2 },
  { label: 'YouTube', href: 'https://www.youtube.com', Icon: Video },
  { label: 'WhatsApp', href: 'https://wa.me/918985419420', Icon: MessageCircle },
]

const trustedLogos = ['Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta', 'Tapflo', 'Blue Ocean', 'Dentalsoft', 'Hotstar', 'IFL', 'Delta']

/* Bento grid features */
const bentoFeatures = [
  { icon: Users, label: 'Lead Management', desc: 'Capture, score, and route leads automatically with AI-powered insights.', span: 'md:col-span-2', gradient: 'from-brand-500 to-cyan-400' },
  { icon: BrainCircuit, label: 'AI Engine', desc: 'Smart recommendations, auto-summaries, and next-best-action prompts.', span: '', gradient: 'from-violet-500 to-brand-500' },
  { icon: Kanban, label: 'Pipeline Board', desc: 'Drag-and-drop Kanban board to visualise every deal stage at a glance.', span: '', gradient: 'from-accent-500 to-emerald-400' },
  { icon: MessageCircle, label: 'Communication Hub', desc: 'Unified inbox for email, WhatsApp, and call logs in one timeline.', span: 'md:col-span-2', gradient: 'from-brand-600 to-accent-500' },
  { icon: Zap, label: 'Automation', desc: 'No-code workflows that trigger tasks, emails, and follow-ups on autopilot.', span: '', gradient: 'from-amber-500 to-rose-500' },
  { icon: BarChart3, label: 'Analytics', desc: 'Real-time dashboards and conversion funnels to track what matters.', span: '', gradient: 'from-emerald-500 to-brand-500' },
  { icon: ShieldCheck, label: 'Enterprise Security', desc: 'SOC 2 compliant, role-based access, audit logs, and data encryption at rest.', span: 'md:col-span-2', gradient: 'from-slate-700 to-brand-600' },
]

const testimonials = [
  ['ApexPrime', 'NexaCRM AI allowed us to reduce duplicated effort and improve forecasting accuracy by 40%.', 'Thomas John', 'CEO', 5],
  ['Global Eleva', 'Our teams got a single source of truth for every customer conversation across channels.', 'Sara Agrawal', 'VP Sales', 5],
  ['Minox', 'We implemented workflows faster and gave managers better visibility into the pipeline.', 'Oyin Robertson', 'CTO', 4],
  ['iNfoty', 'Automation helped us update high-priority accounts without manual effort or delays.', 'Ank Patel', 'Director', 5],
  ['TechVault', 'The AI engine surfaced opportunities we were missing — revenue grew 28% in Q1.', 'Maya Chen', 'Head of Growth', 5],
  ['Orbion', 'We switched from 3 tools to just NexaCRM AI. Everything is finally in one place.', 'Ravi Kumar', 'COO', 4],
]

const faqs = [
  ['How do I migrate to NexaCRM AI?', 'Our team helps import contacts, companies, deals, notes, and activities with guided onboarding — usually under 48 hours.'],
  ['Can teams customize pipelines?', 'Yes. You can create pipelines, fields, automations, and dashboards around your unique sales process.'],
  ['Does NexaCRM AI include AI assistance?', 'Yes. AI agents can summarize records, recommend next actions, and surface high-value opportunities automatically.'],
  ['What integrations are available?', 'We connect with email providers, WhatsApp, calendars, and popular tools through our API and native integrations.'],
  ['Is there a free trial?', 'Yes! Our Starter plan is free forever for up to 3 users. No credit card required.'],
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

const howItWorks = [
  { step: 1, title: 'Connect your data', desc: 'Import contacts, companies, and deals from any source in minutes.', icon: Globe },
  { step: 2, title: 'AI analyzes everything', desc: 'Our engine scores leads, detects patterns, and surfaces opportunities.', icon: BrainCircuit },
  { step: 3, title: 'Automate & scale', desc: 'Set up workflows, sequences, and automations — no code required.', icon: Rocket },
  { step: 4, title: 'Watch revenue grow', desc: 'Track every metric in real-time dashboards and close deals faster.', icon: TrendingUp },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Free',
    period: 'forever',
    desc: 'Perfect for small teams getting started.',
    features: ['Up to 3 users', '500 contacts', 'Basic pipeline', 'Email integration', 'Community support'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Professional',
    price: '₹2,499',
    period: '/user/mo',
    desc: 'For growing teams that need more power.',
    features: ['Unlimited users', '50K contacts', 'AI Engine access', 'Automation workflows', 'Priority support', 'Custom fields', 'API access'],
    cta: 'Start Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large organizations with complex needs.',
    features: ['Everything in Pro', 'Unlimited contacts', 'Dedicated CSM', 'SSO & SAML', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

const marqueeTexts = [
  'AI-Powered CRM',
  '•',
  'Lead Scoring',
  '•',
  'Pipeline Management',
  '•',
  'Smart Automation',
  '•',
  'Real-time Analytics',
  '•',
  'Communication Hub',
  '•',
  'Enterprise Security',
  '•',
]

/* ══════════════════════════════════════════════════════════
   ANIMATED COMPONENTS
   ══════════════════════════════════════════════════════════ */

/* ── Scroll Progress Bar ── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 })

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] origin-left bg-gradient-to-r from-brand-500 via-accent-500 to-violet-500"
      style={{ scaleX }}
    />
  )
}

/* ── Cursor Glow Trail (Good Components-inspired) ── */
function CursorGlow() {
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { damping: 25, stiffness: 200 })
  const springY = useSpring(cursorY, { damping: 25, stiffness: 200 })

  useEffect(() => {
    const move = (e) => {
      cursorX.set(e.clientX)
      cursorY.set(e.clientY)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  return (
    <motion.div
      className="pointer-events-none fixed z-[55] hidden lg:block"
      style={{
        left: springX,
        top: springY,
        width: 400,
        height: 400,
        x: -200,
        y: -200,
        background: 'radial-gradient(circle, rgba(14,165,233,0.06) 0%, rgba(20,184,166,0.03) 40%, transparent 70%)',
        borderRadius: '50%',
      }}
    />
  )
}

/* ── Back to Top Button ── */
function BackToTop() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-brand-500 shadow-lg backdrop-blur transition hover:bg-brand-50 hover:text-brand-600 sm:bottom-28 sm:right-8"
          aria-label="Back to top"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/* ── BlurText — chars blur-in one by one ── */
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

/* ── GlitchText (ReactBits-inspired) ── */
function GlitchText({ text, className = '' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <span ref={ref} className={`landing-glitch ${className}`} data-text={text}>
      {isInView ? text : ''}
    </span>
  )
}

/* ── DecryptedText — scramble then reveal ── */
function DecryptedText({ text, className = '', speed = 50 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-20px' })
  const [displayText, setDisplayText] = useState('')
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*'

  useEffect(() => {
    if (!isInView) return
    let revealIndex = 0
    const interval = setInterval(() => {
      if (revealIndex > text.length) { clearInterval(interval); return }
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
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [isInView, end, duration])

  return <span ref={ref}>{value}{suffix}</span>
}

/* ── Rotating Text Loop ── */
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

/* ── Typewriter Text ── */
function TypewriterText({ text, className = '', speed = 60, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!isInView) return
    let i = 0
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        if (i >= text.length) { clearInterval(interval); return }
        setDisplayed(text.slice(0, i + 1))
        i++
      }, speed)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [isInView, text, speed, delay])

  return (
    <span ref={ref} className={className}>
      {displayed}
      <span className="landing-typewriter-cursor">|</span>
    </span>
  )
}

/* ── Magnetic Button ── */
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
      <Link className={className} {...props}>{children}</Link>
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
      <a href={href} onClick={onClick} className={className} {...props}>{children}</a>
    </motion.div>
  )
}

/* ── TiltedCard — 3D perspective tilt ── */
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
    <div ref={cardRef} className={className} onMouseMove={handleMouse} onMouseLeave={() => setTransform('')}
      style={{ transform, transition: 'transform 0.15s ease-out' }}>
      {children}
    </div>
  )
}

/* ── Infinite Logo Ticker ── */
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

/* ── Marquee Text Banner ── */
function MarqueeBanner({ items }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-brand-500 to-accent-500 py-3">
      <div className="landing-marquee-track flex w-max items-center gap-6 text-sm font-bold text-white/90">
        {[...items, ...items, ...items].map((text, i) => (
          <span key={i} className={text === '•' ? 'text-white/40' : ''}>{text}</span>
        ))}
      </div>
    </div>
  )
}

/* ── Infinite Testimonial Wall ── */
function TestimonialWall({ items }) {
  const half = Math.ceil(items.length / 2)
  const row1 = items.slice(0, half)
  const row2 = items.slice(half)

  const Card = ({ brand, quote, person, role, rating }) => (
    <TiltedCard className="min-w-[300px] max-w-[340px] shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} size={13} className={i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'} />
        ))}
      </div>
      <p className="text-sm leading-6 text-slate-600">"{quote}"</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-500 text-xs font-bold text-white shadow-sm">
          {person[0]}
        </span>
        <div>
          <p className="text-xs font-bold text-slate-900">{person}</p>
          <p className="text-[11px] text-slate-500">{role} · {brand}</p>
        </div>
      </div>
    </TiltedCard>
  )

  return (
    <div className="space-y-4 overflow-hidden">
      <div className="landing-scroll-left flex gap-4">
        {[...row1, ...row1, ...row1].map(([brand, quote, person, role, rating], i) => (
          <Card key={i} brand={brand} quote={quote} person={person} role={role} rating={rating} />
        ))}
      </div>
      <div className="landing-scroll-right flex gap-4">
        {[...row2, ...row2, ...row2].map(([brand, quote, person, role, rating], i) => (
          <Card key={i} brand={brand} quote={quote} person={person} role={role} rating={rating} />
        ))}
      </div>
    </div>
  )
}

/* ── SpotlightCard ── */
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
    <div ref={cardRef} className={`reactbits-spotlight glass-card ${className}`}
      onMouseMove={handleMouseMove} onMouseEnter={() => setOpacity(1)} onMouseLeave={() => setOpacity(0)}>
      <div className="reactbits-spotlight__glow"
        style={{ opacity, background: `radial-gradient(circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 64%)` }} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

/* ── Floating Particles ── */
function FloatingParticles({ count = 24 }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i, size: 2 + (i % 5) * 1.5,
      left: `${(i * 4.35) % 100}%`, top: `${(i * 6.25 + 8) % 100}%`,
      delay: `${(i * 0.7) % 7}s`, duration: `${10 + (i % 6) * 3}s`,
      opacity: 0.12 + (i % 4) * 0.08,
    })), [count])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {particles.map((p) => (
        <span key={p.id} className="absolute rounded-full landing-particle"
          style={{ width: p.size, height: p.size, left: p.left, top: p.top,
            background: p.id % 3 === 0 ? 'rgba(14,165,233,0.5)' : p.id % 3 === 1 ? 'rgba(20,184,166,0.4)' : 'rgba(99,102,241,0.35)',
            opacity: p.opacity, animationDelay: p.delay, animationDuration: p.duration }} />
      ))}
    </div>
  )
}


/* ── Scroll-triggered section ── */
function ScrollReveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }} className={className}>
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
      <motion.div initial={{ scaleX: 1 }} animate={isInView ? { scaleX: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
        className="absolute inset-0 z-10 origin-right bg-gradient-to-r from-brand-100 to-accent-100" />
      <motion.img src={src} alt={alt} initial={{ scale: 1.2 }} animate={isInView ? { scale: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="h-full w-full object-cover object-top" />
    </div>
  )
}

/* ── Parallax Section ── */
function ParallaxImage({ src, alt, className = '' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '-12%'])

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.img src={src} alt={alt} style={{ y }} className="h-[120%] w-full object-cover object-top" />
    </div>
  )
}

/* ── Animated Gradient Border Card ── */
function GradientBorderCard({ children, className = '', highlight = false }) {
  return (
    <div className={`relative rounded-2xl p-[1.5px] ${highlight ? 'landing-gradient-border' : 'bg-slate-200'}`}>
      <div className={`rounded-2xl ${className}`}>
        {children}
      </div>
    </div>
  )
}

/* ── Dock Navigation (ReactBits-inspired) ── */

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
    setMessages(nextMessages); setInput(''); setIsSending(true)

    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages.slice(-10) }) })
      const data = await response.json()
      if (!response.ok || !data.message) throw new Error(data.error || 'The assistant could not respond.')
      setMessages((cur) => [...cur, { role: 'assistant', content: data.message }])
    } catch {
      setMessages((cur) => [...cur, { role: 'assistant', content: 'Sorry, I could not respond right now. Please try again later.' }])
    } finally { setIsSending(false) }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4 sm:bottom-7 sm:right-7">
      <AnimatePresence>
        {isOpen && (
          <motion.section initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }} transition={{ duration: 0.25 }}
            aria-label="AI chat" className="w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:w-[390px]">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-brand-600 to-accent-500 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur"><Bot size={21} /></span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-bold text-white">NexaCRM AI Assistant</h2>
                  <p className="text-xs text-white/70">Powered by AI</p>
                </div>
              </div>
              <button type="button" aria-label="Close chat" onClick={() => setIsOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"><X size={18} /></button>
            </div>
            <div className="flex max-h-[360px] min-h-[300px] flex-col gap-3 overflow-y-auto px-4 py-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <p className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 ${msg.role === 'user'
                    ? 'rounded-br-md bg-brand-500 text-white' : 'rounded-bl-md border border-slate-100 bg-slate-50 text-slate-700'}`}>{msg.content}</p>
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <span className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" /> Thinking</span>
                </div>
              )}
            </div>
            <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-100 bg-slate-50 p-4">
              <label className="sr-only" htmlFor="chat-msg">Message</label>
              <textarea id="chat-msg" value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit() } }}
                placeholder="Type your message..." rows={1}
                className="max-h-28 min-h-11 flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20" />
              <button type="submit" disabled={isSending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-300">
                {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button type="button" onClick={() => setIsOpen((c) => !c)} whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }}
        className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(14,165,233,0.28)] transition">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 transition group-hover:bg-white/25">
          <BotMessageSquare size={18} strokeWidth={2.1} /></span>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.nav initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 24, stiffness: 250 }}
            className="absolute right-0 top-0 flex h-full w-72 flex-col gap-1 bg-white p-6 shadow-xl">
            <button onClick={onClose} className="mb-4 self-end text-slate-500 hover:text-slate-900"><X size={20} /></button>
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`} onClick={onClose}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-50 hover:text-brand-600 transition">{item}</a>
            ))}
            <div className="mt-6 space-y-2.5">
              <Link to="/login" onClick={onClose} className="block rounded-full border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-900 hover:bg-slate-50 transition">Login</Link>
              <Link to="/register" onClick={onClose} className="block rounded-full bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-600 transition">Get Started Free</Link>
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
      <ScrollProgress />
      <CursorGlow />

      <div className="mx-auto max-w-7xl bg-white">

        {/* ═══ HERO ═══ */}
        <section className="relative overflow-hidden px-5 pt-5 sm:px-8 lg:px-16">
          <div className="absolute inset-x-0 top-0 h-[750px] overflow-hidden">
            <img src="/hero-clouds.png" alt="" aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-white/30" />
            <FloatingParticles count={28} />
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-white to-transparent" />
          </div>

          <div className="relative z-10">
            {/* Navbar */}
            <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5 }}
              className="sticky top-4 z-30 mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-full border border-slate-200/70 bg-white/70 px-3.5 py-2 shadow-[0_10px_28px_rgba(14,165,233,0.08)] backdrop-blur-2xl">
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
                <Link to="/register" className="hidden h-8 items-center justify-center gap-1.5 rounded-full bg-brand-500 px-4 text-[11px] font-semibold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600 sm:inline-flex">
                  Get Started <ArrowRight size={12} />
                </Link>
                <button aria-label="Open menu" onClick={() => setMobileNav(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-900 shadow-sm transition hover:bg-white lg:hidden">
                  <Menu size={16} />
                </button>
              </div>
            </motion.header>

            <MobileNav open={mobileNav} onClose={() => setMobileNav(false)} />

            {/* Hero content */}
            <div id="home" className="relative mx-auto max-w-3xl pb-6 pt-16 text-center sm:pt-20">

              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 0.2 }}
                className="nexa-signal-pill mx-auto mb-6 w-fit">
                <Radio className="h-3.5 w-3.5" />
                AI-Powered CRM Platform
              </motion.div>

              <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-[56px]">
                <BlurText text="Simplify CRM" className="block" />
                <RotatingText texts={heroRotatingTexts} className="mt-2 h-[1.2em]" />
              </h1>

              <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }}
                className="mx-auto mt-5 max-w-lg text-base leading-7 text-slate-600">
                Manage leads, customers, and sales activity from first touch to closed deal — powered by intelligent AI automation.
              </motion.p>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }}
                className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <MagneticButton to="/register"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600 hover:shadow-brand-500/35">
                  Get Started Free <ArrowRight size={15} />
                </MagneticButton>
                <MagneticAnchor href="#testimonial"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 text-sm font-bold text-slate-900 transition hover:border-brand-300 hover:text-brand-600">
                  <Play size={14} className="text-brand-500" /> Watch Demo
                </MagneticAnchor>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.2 }}
                className="mt-8 flex flex-wrap justify-center gap-2">
                {[
                  { label: 'Live Signal', icon: Radio, tone: 'emerald' },
                  { label: 'AI Assist', icon: BrainCircuit, tone: 'cyan' },
                  { label: 'Secure CRM', icon: ShieldCheck, tone: 'violet' },
                ].map(({ label, icon: Icon, tone }) => (
                  <motion.div key={label} whileHover={{ scale: 1.08, y: -2 }} className={`nexa-orbit-tile nexa-orbit-tile--${tone}`}>
                    <Icon className="h-4 w-4" /><span>{label}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Hero dashboard with parallax */}
            <ScrollReveal className="relative mx-auto mt-4 max-w-4xl pb-10">
              <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xl shadow-brand-500/10 ring-4 ring-white/50">
                <ParallaxImage src="/hero-dashboard.png" alt="NexaCRM AI dashboard overview" className="h-[200px] sm:h-[280px] lg:h-[360px]" />
              </div>
              {/* Floating feature badges */}
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.6, type: 'spring' }}
                className="absolute -left-4 top-1/3 hidden rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur lg:block">
                <p className="text-[10px] font-bold text-emerald-600">↑ 42% Revenue</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ delay: 0.8, type: 'spring' }}
                className="absolute -right-4 top-1/4 hidden rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-lg backdrop-blur lg:block">
                <p className="text-[10px] font-bold text-brand-600">🤖 AI Active</p>
              </motion.div>
            </ScrollReveal>

            {/* Logo ticker */}
            <ScrollReveal className="mx-auto max-w-5xl border-y border-slate-100 py-8">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Trusted by 300K+ businesses worldwide
              </p>
              <LogoTicker items={trustedLogos} />
            </ScrollReveal>
          </div>
        </section>

        {/* ═══ MARQUEE BANNER ═══ */}
        <MarqueeBanner items={marqueeTexts} />

        <div className="bg-white">

          {/* ═══ HOW IT WORKS ═══ */}
          <section className="px-6 py-24 sm:px-10 lg:px-24">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                <Layers className="h-3.5 w-3.5" />
                How It Works
              </div>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <span className="reactbits-gradient-text">Up and running in 4 simple steps</span>
              </h2>
            </ScrollReveal>

            <div className="relative mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-4">
              {/* Connecting line */}
              <div className="absolute top-10 left-[12.5%] right-[12.5%] hidden h-[2px] bg-gradient-to-r from-brand-300 via-accent-300 to-violet-300 md:block" aria-hidden="true" />

              {howItWorks.map(({ step, title, desc, icon: Icon }, i) => (
                <ScrollReveal key={step} delay={i * 0.12}>
                  <div className="flex flex-col items-center text-center">
                    <motion.div whileHover={{ scale: 1.1, rotate: 5 }}
                      className="relative z-10 mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-xl shadow-brand-500/20">
                      <Icon size={28} />
                      <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-extrabold text-brand-600 shadow-md ring-2 ring-brand-100">
                        {step}
                      </span>
                    </motion.div>
                    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ═══ BENTO GRID FEATURES ═══ */}
          <section id="features" className="px-6 py-24 sm:px-10 lg:px-24">
            <ScrollReveal className="mx-auto max-w-2xl text-center">
              <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                <Sparkles className="h-3.5 w-3.5" />
                Core Features
              </div>
              <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                <GlitchText text="Supercharge your sales with AI" className="reactbits-gradient-text" />
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                Harness the power of multi-agent AI to automate your CRM, surface the best opportunities, and move every deal forward.
              </p>
            </ScrollReveal>

            <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-4">
              {bentoFeatures.map(({ icon: Icon, label, desc, span, gradient }, i) => (
                <ScrollReveal key={label} delay={i * 0.06} className={span}>
                  <TiltedCard>
                    <SpotlightCard className="h-full rounded-2xl border border-slate-200 bg-white p-6">
                      <div className={`dashboard-card-icon mb-4 bg-gradient-to-br ${gradient}`}>
                        <Icon className="h-[18px] w-[18px] text-white" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">{label}</h3>
                      <p className="mt-2 text-xs leading-5 text-slate-500">{desc}</p>
                    </SpotlightCard>
                  </TiltedCard>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal delay={0.2} className="mx-auto mt-14 max-w-4xl">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-brand-500/10 ring-1 ring-slate-100">
                <ParallaxImage src="/hero-dashboard.png" alt="NexaCRM AI automation dashboard" className="h-[200px] sm:h-[280px] lg:h-[360px] rounded-xl" />
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ COLLABORATION ═══ */}
          <section className="relative overflow-hidden px-6 py-24 sm:px-10 lg:px-24">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-transparent to-transparent" />
            <div className="relative">
              <ScrollReveal className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                  <span className="reactbits-gradient-text">Teams that work together, win together</span>
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Multiple teams can work together inside a CRM built for collaboration, shared ownership, and faster customer outcomes.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {['Transparency', 'Territory Creation', '360 Customer Design', 'Team Sync', 'Shared Pipeline'].map((item, i) => (
                    <motion.span key={item} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08 }}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-brand-600 shadow-sm">
                      {item}
                    </motion.span>
                  ))}
                </div>
              </ScrollReveal>

              <ScrollReveal delay={0.15} className="mx-auto mt-10 max-w-5xl">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-brand-500/10 ring-1 ring-slate-100">
                  <ImageReveal src="/hero-dashboard.png" alt="Collaborative CRM workspace" className="h-auto w-full rounded-xl" />
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ═══ TESTIMONIALS ═══ */}
          <section id="testimonial" className="py-24 overflow-hidden">
            <ScrollReveal className="mx-auto max-w-3xl px-6 text-center">
              <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                <Star className="h-3.5 w-3.5" />
                Testimonials
              </div>
              <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
                <BlurText text="Loved by teams everywhere" />
              </h2>
              <p className="mt-3 text-sm text-slate-500">See what our customers are saying about NexaCRM AI</p>
            </ScrollReveal>
            <div className="mt-12">
              <TestimonialWall items={testimonials} />
            </div>
          </section>

          {/* ═══ SCALE YOUR SALES ═══ */}
          <section className="px-6 py-24 sm:px-10 lg:px-24">
            <ScrollReveal>
              <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-brand-500/8 md:grid-cols-2">
                <div className="p-8 sm:p-10">
                  <h2 className="text-3xl font-bold leading-tight">
                    <span className="reactbits-gradient-text">Scale your sales</span>
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    Advanced workflows, cadences, and no-code functions to help you sell faster and scale efficiently.
                  </p>
                  <MagneticAnchor href="#pricing"
                    className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-brand-500 hover:text-brand-600">
                    Explore workflow automation <ArrowRight size={15} />
                  </MagneticAnchor>
                </div>
                <div className="bg-gradient-to-br from-brand-50 via-brand-100/50 to-accent-50 p-8">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                    {['Lead captured', 'AI scores lead', 'Owner assigned', 'Follow-up queued', 'Deal closed ✓'].map((step, i) => (
                      <motion.div key={step} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.12 }}
                        className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-xs font-bold text-white shadow-sm">{i + 1}</span>
                        <span className="text-sm font-bold text-slate-700">{step}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ STATS ═══ */}
          <section className="px-6 py-24 sm:px-10 lg:px-24">
            <div className="mx-auto grid max-w-5xl items-end gap-6 md:grid-cols-5">
              <ScrollReveal className="md:col-span-1">
                <h2 className="text-3xl font-bold leading-tight text-slate-700">Grow<br />with <span className="reactbits-gradient-text">NexaCRM AI</span></h2>
              </ScrollReveal>
              {stats.map(([value, suffix, label], i) => (
                <ScrollReveal key={label} delay={i * 0.1}>
                  <article className="group rounded-t-full bg-gradient-to-b from-brand-50 via-brand-100/40 to-accent-50 px-6 pb-8 pt-16 text-center shadow-sm ring-1 ring-brand-100/50 transition-all hover:shadow-lg hover:ring-brand-200/70 hover:-translate-y-1">
                    <strong className="text-4xl font-extrabold text-slate-900">
                      <CountUp end={value} suffix={suffix} />
                    </strong>
                    <p className="mx-auto mt-2 max-w-32 text-xs font-bold text-slate-700">{label}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </section>

          {/* ═══ 360° VIEW ═══ */}
          <section className="relative overflow-hidden px-6 py-24 sm:px-10 lg:px-24">
            <div className="absolute inset-0 bg-gradient-to-b from-white via-brand-50/40 to-white" />
            <div className="relative">
              <ScrollReveal className="mx-auto max-w-2xl text-center mb-14">
                <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                  <Layers className="h-3.5 w-3.5" />
                  All-in-One Platform
                </div>
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                  <span className="reactbits-gradient-text">Everything in a neat 360° view</span>
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  One unified platform that connects every department — sales, support, marketing, and finance — so nothing slips through the cracks.
                </p>
              </ScrollReveal>

              <div className="mx-auto max-w-5xl">
                {/* Module cards grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    { icon: Users, label: 'CRM', desc: 'Contacts & companies', color: 'from-brand-500 to-cyan-400' },
                    { icon: Target, label: 'Sales', desc: 'Pipeline & deals', color: 'from-violet-500 to-brand-500' },
                    { icon: MessageCircle, label: 'Support', desc: 'Tickets & chat', color: 'from-accent-500 to-emerald-400' },
                    { icon: BarChart3, label: 'Finance', desc: 'Invoices & billing', color: 'from-amber-500 to-orange-400' },
                    { icon: Mail, label: 'Marketing', desc: 'Campaigns & emails', color: 'from-rose-500 to-pink-400' },
                  ].map(({ icon: Icon, label, desc, color }, i) => (
                    <ScrollReveal key={label} delay={i * 0.08}>
                      <motion.div whileHover={{ y: -6, scale: 1.03 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg hover:shadow-brand-500/10 cursor-default">
                        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-sm`}>
                          <Icon size={20} className="text-white" />
                        </div>
                        <p className="text-sm font-bold text-slate-900">{label}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
                        <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${color} opacity-0 blur-2xl transition-opacity group-hover:opacity-20`} />
                      </motion.div>
                    </ScrollReveal>
                  ))}
                </div>

                {/* Central connector */}
                <ScrollReveal delay={0.3}>
                  <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50 via-white to-accent-50 p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 shadow-lg shadow-brand-500/25">
                      <CircleDot size={28} className="text-white" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">Unified 360° Platform</p>
                    <p className="mt-1 text-sm text-slate-500">All modules connected, all data in sync — real-time.</p>
                    <div className="mt-5 flex justify-center gap-3">
                      <MagneticButton to="/register" className="rounded-full bg-brand-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-sm shadow-brand-500/20 transition hover:bg-brand-600">
                        Get Started</MagneticButton>
                      <MagneticAnchor href="#pricing" className="rounded-full bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800">
                        See Pricing</MagneticAnchor>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>

          {/* ═══ PRICING ═══ */}
          <section id="pricing" className="relative overflow-hidden px-6 py-24 sm:px-10 lg:px-24">
            <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white" />
            <div className="relative">
              <ScrollReveal className="mx-auto max-w-2xl text-center">
                <div className="nexa-signal-pill mx-auto mb-4 w-fit">
                  <Crown className="h-3.5 w-3.5" />
                  Pricing
                </div>
                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                  <DecryptedText text="Plans for every team size" className="reactbits-gradient-text" speed={35} />
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Start free. Upgrade when you're ready. No credit card required.
                </p>
              </ScrollReveal>

              <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
                {pricingPlans.map((plan, i) => (
                  <ScrollReveal key={plan.name} delay={i * 0.1}>
                    <GradientBorderCard highlight={plan.highlight} className={`h-full bg-white p-7 ${plan.highlight ? 'relative' : ''}`}>
                      {plan.highlight && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-accent-500 px-4 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-lg">
                          Most Popular
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <div className="mt-3 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-slate-900">{plan.price}</span>
                        {plan.period && <span className="text-sm text-slate-500">{plan.period}</span>}
                      </div>
                      <p className="mt-2 text-sm text-slate-500">{plan.desc}</p>
                      <ul className="mt-6 space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2.5 text-sm text-slate-700">
                            <Check size={15} className="shrink-0 text-emerald-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <MagneticButton to="/register"
                        className={`mt-7 flex h-11 w-full items-center justify-center rounded-xl text-sm font-bold transition ${
                          plan.highlight
                            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600'
                            : 'border border-slate-200 bg-white text-slate-900 hover:border-brand-300 hover:text-brand-600'
                        }`}>
                        {plan.cta} <ArrowRight size={14} className="ml-2" />
                      </MagneticButton>
                    </GradientBorderCard>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ CTA ═══ */}
          <section className="px-6 py-24 sm:px-10 lg:px-24">
            <ScrollReveal>
              <div className="nexa-command-hero mx-auto max-w-5xl p-8 text-center sm:p-14">
                <div className="relative z-10">
                  <h2 className="text-4xl font-bold sm:text-5xl">
                    <BlurText text="Take us for a spin!" className="reactbits-gradient-text" />
                  </h2>
                  <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
                    className="mx-auto mt-4 max-w-md text-sm text-slate-500">
                    Join 300K+ businesses already using NexaCRM AI to close more deals and grow faster.
                  </motion.p>
                  <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
                    className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <MagneticButton to="/register" className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition hover:bg-brand-600">
                      Get Started Free <ArrowRight size={14} />
                    </MagneticButton>
                    <MagneticAnchor href="#contact" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-900 transition hover:border-brand-300">
                      Talk to Sales
                    </MagneticAnchor>
                  </motion.div>
                  <ScrollReveal delay={0.2} className="mt-10">
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <ImageReveal src="/hero-dashboard.png" alt="NexaCRM AI product preview" className="h-auto w-full rounded-lg" />
                    </div>
                  </ScrollReveal>
                </div>
              </div>
            </ScrollReveal>
          </section>

          {/* ═══ FAQ ═══ */}
          <section className="px-6 py-24 sm:px-10 lg:px-24">
            <div className="mx-auto max-w-3xl">
              <ScrollReveal className="text-center mb-10">
                <h2 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                  <DecryptedText text="Frequently Asked Questions" speed={40} />
                </h2>
              </ScrollReveal>
              <div className="space-y-3">
                {faqs.map(([question, answer], i) => (
                  <ScrollReveal key={question} delay={i * 0.06}>
                    <details className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-200 hover:shadow-md open:shadow-lg open:ring-1 open:ring-brand-100">
                      <summary className="flex cursor-pointer items-center justify-between text-sm font-bold text-slate-900 group-open:text-brand-600">
                        {question}
                        <ChevronDown size={16} className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180 group-open:text-brand-500" />
                      </summary>
                      <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 text-sm leading-6 text-slate-600">{answer}</motion.p>
                    </details>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>

          {/* ═══ FOOTER ═══ */}
          <footer className="relative overflow-hidden bg-slate-950 px-5 pb-20 pt-12 text-slate-300 sm:px-8 sm:pb-24 lg:px-10">
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
                      <Phone size={18} /></span>+91 89854 19420</a>
                  <a href="mailto:Info@kriscel.com" className="group flex items-center gap-3 text-sm font-bold text-slate-200">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-400 transition group-hover:border-brand-500/40 group-hover:bg-brand-500/10">
                      <Mail size={18} /></span>Info@kriscel.com</a>
                  <div className="flex items-start gap-3 text-sm leading-6 text-slate-400">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-400">
                      <MapPin size={18} /></span>
                    <span>229, Bharthal, Sector 26, Dwarka, South West Delhi, 110077</span>
                  </div>
                </div>
              </div>

              <nav aria-label="Footer quick links">
                <h2 className="text-xs font-extrabold uppercase tracking-[0.18em] text-white">Quick Links</h2>
                <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                  {quickLinks.map(({ label, href }) => (
                    <li key={label}>
                      {href.startsWith('/') ? (
                        <Link to={href} className="transition hover:text-white">{label}</Link>
                      ) : (
                        <a href={href} className="transition hover:text-white">{label}</a>
                      )}
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
                      <Icon size={17} /> {label}</a>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
              <p>&copy; 2026 <a href="https://www.kriscel.com" target="_blank" rel="noreferrer" className="font-semibold transition hover:text-white">Kriscel Tech Pvt. Ltd.</a> All rights reserved.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                <Link to="/privacy" className="transition hover:text-white">Privacy Policy</Link>
                <Link to="/terms" className="transition hover:text-white">Terms of Service</Link>
              </div>
            </div>
          </footer>
        </div>
      </div>

      <Chatbot />
      <BackToTop />

      {/* CSS for all landing animations */}
      <style>{`
        /* Scroll progress handled by Framer Motion */

        /* Infinite ticker */
        @keyframes landingTickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .landing-ticker-track { animation: landingTickerScroll 30s linear infinite; }
        .landing-ticker-track:hover { animation-play-state: paused; }

        /* Marquee */
        @keyframes landingMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        .landing-marquee-track { animation: landingMarquee 20s linear infinite; }

        /* Testimonial wall */
        @keyframes landingScrollLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-33.33%); } }
        @keyframes landingScrollRight { 0% { transform: translateX(-33.33%); } 100% { transform: translateX(0); } }
        .landing-scroll-left { animation: landingScrollLeft 45s linear infinite; }
        .landing-scroll-right { animation: landingScrollRight 45s linear infinite; }
        .landing-scroll-left:hover, .landing-scroll-right:hover { animation-play-state: paused; }

        /* Floating particles */
        @keyframes landingFloat {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(14px, -22px) scale(1.4); }
          50% { transform: translate(-10px, -38px) scale(0.7); }
          75% { transform: translate(18px, -14px) scale(1.2); }
        }
        .landing-particle { animation: landingFloat 14s ease-in-out infinite; }

        /* 3D Glass Orb */
        .landing-3d-orb { position: relative; width: 200px; height: 200px; }
        .landing-3d-orb__inner {
          position: absolute; inset: 25px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(14,165,233,0.4), rgba(20,184,166,0.2) 50%, rgba(99,102,241,0.15) 80%, transparent);
          box-shadow: inset 0 0 30px rgba(14,165,233,0.2), 0 0 60px rgba(14,165,233,0.15);
          animation: landingOrbPulse 4s ease-in-out infinite;
        }
        .landing-3d-orb__ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 1.5px solid rgba(14,165,233,0.2);
          animation: landingOrbSpin 12s linear infinite;
        }
        .landing-3d-orb__ring--2 { inset: 10px; border-color: rgba(20,184,166,0.15); animation-duration: 18s; animation-direction: reverse; }
        .landing-3d-orb__ring--3 { inset: -10px; border-color: rgba(99,102,241,0.1); animation-duration: 24s; }
        @keyframes landingOrbPulse { 0%, 100% { transform: scale(1); opacity: 0.7; } 50% { transform: scale(1.05); opacity: 1; } }
        @keyframes landingOrbSpin { 0% { transform: rotateX(60deg) rotateZ(0deg); } 100% { transform: rotateX(60deg) rotateZ(360deg); } }

        /* GlitchText */
        .landing-glitch {
          position: relative;
          display: inline-block;
        }
        .landing-glitch::before,
        .landing-glitch::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
        }
        .landing-glitch:hover::before {
          animation: landingGlitch1 0.3s ease-in-out;
          color: rgba(14,165,233,0.7);
          opacity: 0.8;
        }
        .landing-glitch:hover::after {
          animation: landingGlitch2 0.3s ease-in-out 0.05s;
          color: rgba(20,184,166,0.7);
          opacity: 0.8;
        }
        @keyframes landingGlitch1 {
          0% { clip-path: inset(40% 0 40% 0); transform: translate(-2px, -1px); }
          20% { clip-path: inset(10% 0 80% 0); transform: translate(1px, 2px); }
          40% { clip-path: inset(60% 0 10% 0); transform: translate(-1px, -2px); }
          60% { clip-path: inset(20% 0 50% 0); transform: translate(2px, 1px); }
          80% { clip-path: inset(70% 0 5% 0); transform: translate(-2px, 2px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: 0; }
        }
        @keyframes landingGlitch2 {
          0% { clip-path: inset(60% 0 20% 0); transform: translate(2px, 1px); }
          20% { clip-path: inset(30% 0 50% 0); transform: translate(-1px, -2px); }
          40% { clip-path: inset(80% 0 5% 0); transform: translate(1px, 2px); }
          60% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, -1px); }
          80% { clip-path: inset(50% 0 30% 0); transform: translate(2px, -2px); }
          100% { clip-path: inset(0 0 0 0); transform: translate(0); opacity: 0; }
        }

        /* Animated gradient border */
        .landing-gradient-border {
          background: linear-gradient(135deg, #0ea5e9, #14b8a6, #8b5cf6, #0ea5e9);
          background-size: 300% 300%;
          animation: landingGradientBorder 4s ease infinite;
        }
        @keyframes landingGradientBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Typewriter cursor */
        .landing-typewriter-cursor {
          animation: landingBlink 1s step-end infinite;
          color: #0ea5e9;
          font-weight: 300;
        }
        @keyframes landingBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

        /* Reduce motion */
        @media (prefers-reduced-motion: reduce) {
          .landing-ticker-track, .landing-scroll-left, .landing-scroll-right,
          .landing-particle, .landing-3d-orb__inner, .landing-3d-orb__ring,
          .landing-marquee-track, .landing-gradient-border { animation: none !important; }
        }
      `}</style>
    </main>
  )
}
