import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── Animated CRM illustration (left panel) ─────────────────────── */
function CRMAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Floating gradient orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-30 animate-[float_8s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.4), transparent 70%)', top: '10%', left: '5%' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-25 animate-[float_10s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.35), transparent 70%)', bottom: '10%', right: '0%' }} />
      <div className="absolute w-[300px] h-[300px] rounded-full opacity-20 animate-[float_12s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)', top: '50%', left: '40%' }} />

      {/* Main CRM SVG Illustration */}
      <svg viewBox="0 0 500 500" className="w-[85%] max-w-[420px] relative z-10 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
        {/* Dashboard card background */}
        <rect x="50" y="60" width="400" height="320" rx="24" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
          <animate attributeName="y" values="60;55;60" dur="4s" repeatCount="indefinite" />
        </rect>
        <rect x="50" y="60" width="400" height="50" rx="24" fill="rgba(14,165,233,0.15)" />
        {/* Fake window dots */}
        <circle cx="78" cy="85" r="6" fill="#ef4444" opacity="0.7" />
        <circle cx="98" cy="85" r="6" fill="#f59e0b" opacity="0.7" />
        <circle cx="118" cy="85" r="6" fill="#22c55e" opacity="0.7" />
        <text x="200" y="90" textAnchor="middle" fill="rgba(14,165,233,0.8)" fontSize="13" fontWeight="700" fontFamily="Roboto, sans-serif">CRM Dashboard</text>

        {/* KPI cards row */}
        <g opacity="0.9">
          <rect x="75" y="125" width="100" height="55" rx="12" fill="rgba(255,255,255,0.6)" stroke="rgba(14,165,233,0.2)" strokeWidth="1">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite" />
          </rect>
          <text x="125" y="148" textAnchor="middle" fill="#0ea5e9" fontSize="10" fontWeight="600" fontFamily="Roboto, sans-serif">Leads</text>
          <text x="125" y="168" textAnchor="middle" fill="#0c4a6e" fontSize="18" fontWeight="800" fontFamily="Roboto, sans-serif">2,847</text>

          <rect x="195" y="125" width="100" height="55" rx="12" fill="rgba(255,255,255,0.6)" stroke="rgba(20,184,166,0.2)" strokeWidth="1">
            <animate attributeName="opacity" values="1;0.7;1" dur="3s" repeatCount="indefinite" />
          </rect>
          <text x="245" y="148" textAnchor="middle" fill="#14b8a6" fontSize="10" fontWeight="600" fontFamily="Roboto, sans-serif">Deals</text>
          <text x="245" y="168" textAnchor="middle" fill="#0c4a6e" fontSize="18" fontWeight="800" fontFamily="Roboto, sans-serif">₹42L</text>

          <rect x="315" y="125" width="100" height="55" rx="12" fill="rgba(255,255,255,0.6)" stroke="rgba(139,92,246,0.2)" strokeWidth="1">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3.5s" repeatCount="indefinite" />
          </rect>
          <text x="365" y="148" textAnchor="middle" fill="#8b5cf6" fontSize="10" fontWeight="600" fontFamily="Roboto, sans-serif">Conv.</text>
          <text x="365" y="168" textAnchor="middle" fill="#0c4a6e" fontSize="18" fontWeight="800" fontFamily="Roboto, sans-serif">68%</text>
        </g>

        {/* Animated chart */}
        <g transform="translate(75, 195)">
          <rect width="180" height="120" rx="12" fill="rgba(255,255,255,0.5)" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
          <text x="90" y="18" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Roboto, sans-serif">Revenue Trend</text>
          {/* Chart bars */}
          {[
            { x: 15, h: 40, color: '#0ea5e9', delay: '0s' },
            { x: 35, h: 55, color: '#14b8a6', delay: '0.2s' },
            { x: 55, h: 35, color: '#0ea5e9', delay: '0.4s' },
            { x: 75, h: 70, color: '#14b8a6', delay: '0.6s' },
            { x: 95, h: 50, color: '#0ea5e9', delay: '0.8s' },
            { x: 115, h: 80, color: '#14b8a6', delay: '1s' },
            { x: 135, h: 65, color: '#0ea5e9', delay: '1.2s' },
            { x: 155, h: 90, color: '#14b8a6', delay: '1.4s' },
          ].map(({ x, h, color, delay }) => (
            <rect key={x} x={x} y={105 - h} width="14" height={h} rx="3" fill={color} opacity="0.7">
              <animate attributeName="height" values={`0;${h};${h}`} dur="1.5s" begin={delay} fill="freeze" />
              <animate attributeName="y" values={`105;${105 - h};${105 - h}`} dur="1.5s" begin={delay} fill="freeze" />
              <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" begin={delay} repeatCount="indefinite" />
            </rect>
          ))}
        </g>

        {/* Lead pipeline funnel */}
        <g transform="translate(275, 195)">
          <rect width="140" height="120" rx="12" fill="rgba(255,255,255,0.5)" stroke="rgba(20,184,166,0.15)" strokeWidth="1" />
          <text x="70" y="18" textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Roboto, sans-serif">Pipeline</text>
          {/* Funnel stages */}
          {[
            { y: 30, w: 110, label: 'New', color: '#0ea5e9', delay: '0.3s' },
            { y: 50, w: 90, label: 'Qualified', color: '#06b6d4', delay: '0.6s' },
            { y: 70, w: 70, label: 'Proposal', color: '#14b8a6', delay: '0.9s' },
            { y: 90, w: 50, label: 'Won', color: '#10b981', delay: '1.2s' },
          ].map(({ y, w, label, color, delay }) => (
            <g key={label}>
              <rect x={(140 - w) / 2} y={y} width={w} height="16" rx="4" fill={color} opacity="0.6">
                <animate attributeName="width" values={`0;${w}`} dur="1s" begin={delay} fill="freeze" />
                <animate attributeName="x" values={`70;${(140 - w) / 2}`} dur="1s" begin={delay} fill="freeze" />
              </rect>
              <text x="70" y={y + 12} textAnchor="middle" fill="white" fontSize="8" fontWeight="600" fontFamily="Roboto, sans-serif">{label}</text>
            </g>
          ))}
        </g>

        {/* Floating notification badges */}
        <g>
          <circle cx="420" cy="80" r="14" fill="#0ea5e9" opacity="0.9">
            <animate attributeName="r" values="14;16;14" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="420" y="85" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">5</text>
        </g>

        {/* Animated connecting lines (data flow) */}
        <line x1="170" y1="330" x2="280" y2="330" stroke="rgba(14,165,233,0.3)" strokeWidth="1.5" strokeDasharray="6,4">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
        </line>

        {/* User avatars */}
        <g transform="translate(100, 335)" opacity="0.8">
          <circle cx="0" cy="0" r="15" fill="#0ea5e9" opacity="0.8" />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">S</text>
          <circle cx="28" cy="0" r="15" fill="#14b8a6" opacity="0.8" />
          <text x="28" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">A</text>
          <circle cx="56" cy="0" r="15" fill="#8b5cf6" opacity="0.8" />
          <text x="56" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Roboto, sans-serif">M</text>
          <circle cx="84" cy="0" r="13" fill="rgba(14,165,233,0.2)" stroke="rgba(14,165,233,0.4)" strokeWidth="1.5" strokeDasharray="4,3">
            <animate attributeName="stroke-dashoffset" values="0;-14" dur="3s" repeatCount="indefinite" />
          </circle>
          <text x="84" y="5" textAnchor="middle" fill="#0ea5e9" fontSize="14" fontWeight="400" fontFamily="Roboto, sans-serif">+</text>
        </g>
      </svg>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-[float_6s_ease-in-out_infinite]"
          style={{
            width: 6 + i * 2,
            height: 6 + i * 2,
            background: i % 2 === 0 ? 'rgba(14,165,233,0.3)' : 'rgba(20,184,166,0.3)',
            top: `${15 + i * 13}%`,
            left: `${10 + i * 15}%`,
            animationDelay: `${i * 0.8}s`,
            animationDuration: `${5 + i}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setPersistenceMode } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authAPI.login({ email, password })
      const user = data?.user ?? null
      const accessToken = data?.accessToken ?? data?.token ?? null
      const refreshToken = data?.refreshToken ?? null

      if (!user || !accessToken) {
        throw new Error('Login succeeded but the session payload was incomplete.')
      }

      if (user.role === 'PLATFORM_ADMIN') {
        throw new Error('Platform Admins must use the Platform Admin login page.')
      }

      setPersistenceMode(rememberMe ? 'local' : 'session')
      login(user, accessToken, refreshToken)
      toast.success(`Welcome back, ${user?.name ?? 'User'}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err?.message || 'Login failed. Check backend connection and credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(135deg, #e0f2fe 0%, #ccfbf1 25%, #f0f9ff 50%, #d1fae5 75%, #e0f2fe 100%)' }}
    >
      {/* Glassmorphism background orbs */}
      <div className="pointer-events-none absolute inset-0" style={{
        background: `
          radial-gradient(ellipse 700px 500px at 15% 8%, rgba(14,165,233,0.15), transparent),
          radial-gradient(ellipse 600px 400px at 85% 15%, rgba(20,184,166,0.12), transparent),
          radial-gradient(ellipse 500px 400px at 50% 80%, rgba(139,92,246,0.08), transparent)
        `,
      }} />

      {/* Left panel — CRM Animation */}
      <div className="hidden lg:flex flex-col w-1/2 relative">
        <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(20,184,166,0.85))',
              boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
            }}
          >
            <span className="text-white text-lg font-black tracking-tighter">N</span>
          </div>
          <div>
            <p className="text-slate-800 font-bold text-lg leading-none">NexaCRM</p>
            <p className="text-brand-500 text-xs font-semibold tracking-widest uppercase">AI Platform</p>
          </div>
        </div>

        <CRMAnimation />

        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="flex gap-6">
            {[
              { value: '10x', label: 'Lead Conversion' },
              { value: '2.5h', label: 'Saved Daily' },
              { value: '98%', label: 'Customer Satisfaction' },
            ].map(({ value, label }) => (
              <div key={label} className="backdrop-blur-md bg-white/40 rounded-xl px-4 py-3 border border-white/50">
                <p className="text-xl font-bold text-slate-800">{value}</p>
                <p className="text-[10px] text-slate-500 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(20,184,166,0.85))',
                boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
              }}
            >
              <span className="text-white text-lg font-black">N</span>
            </div>
            <div>
              <p className="text-slate-800 font-bold text-lg leading-none">NexaCRM</p>
              <p className="text-brand-500 text-xs font-semibold">AI Platform</p>
            </div>
          </div>

          {/* Glass card */}
          <div
            className="rounded-3xl p-8 sm:p-10"
            style={{
              background: 'rgba(255,255,255,0.45)',
              backdropFilter: 'blur(24px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 8px 32px rgba(14,165,233,0.08), 0 2px 8px rgba(0,0,0,0.04)',
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 text-sm mt-1">Sign in to your sales command center</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Email Address</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email"
                  className="w-full rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(14,165,233,0.15)',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(14,165,233,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1), inset 0 1px 2px rgba(0,0,0,0.04)' }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(14,165,233,0.15)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                    required autoComplete="current-password"
                    className="w-full rounded-xl px-4 py-3 pr-12 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(14,165,233,0.15)',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(14,165,233,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.1), inset 0 1px 2px rgba(0,0,0,0.04)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(14,165,233,0.15)'; e.target.style.boxShadow = 'inset 0 1px 2px rgba(0,0,0,0.04)' }}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => toast('Password resets are handled by your admin or identity provider.')}
                  className="text-brand-500 hover:text-brand-600 font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 text-base gap-2 disabled:opacity-70 flex items-center justify-center font-semibold rounded-xl text-white transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #14b8a6)',
                  boxShadow: '0 4px 15px rgba(14,165,233,0.3), 0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500 mt-6 space-y-1.5">
            <p>Use your assigned workspace credentials to sign in.</p>
            <p>
              Need access? <Link to="/register" className="text-brand-500 hover:text-brand-600 font-semibold">Request an invite</Link>
            </p>
            <p>
              Platform Admin? <Link to="/platform/login" className="text-brand-500 hover:text-brand-600 font-semibold">Sign in here</Link>
            </p>
          </div>
        </motion.div>
      </div>

      {/* CSS animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-15px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
      `}</style>
    </div>
  )
}
