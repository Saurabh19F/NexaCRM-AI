import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

/* ── Animated Platform Admin illustration (left panel) ──────────── */
function PlatformAnimation() {
  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* Floating gradient orbs */}
      <div className="absolute w-[500px] h-[500px] rounded-full opacity-30 animate-[float_8s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.35), transparent 70%)', top: '5%', left: '0%' }} />
      <div className="absolute w-[400px] h-[400px] rounded-full opacity-25 animate-[float_10s_ease-in-out_infinite_reverse]"
        style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.3), transparent 70%)', bottom: '5%', right: '-5%' }} />
      <div className="absolute w-[350px] h-[350px] rounded-full opacity-20 animate-[float_12s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent 70%)', top: '40%', left: '30%' }} />

      {/* Main Platform SVG Illustration */}
      <svg viewBox="0 0 500 500" className="w-[85%] max-w-[420px] relative z-10 drop-shadow-2xl" xmlns="http://www.w3.org/2000/svg">
        {/* Central shield/platform card */}
        <rect x="60" y="50" width="380" height="340" rx="24" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
          <animate attributeName="y" values="50;45;50" dur="4s" repeatCount="indefinite" />
        </rect>
        <rect x="60" y="50" width="380" height="50" rx="24" fill="rgba(14,165,233,0.12)" />
        {/* Window dots */}
        <circle cx="88" cy="75" r="6" fill="#ef4444" opacity="0.7" />
        <circle cx="108" cy="75" r="6" fill="#f59e0b" opacity="0.7" />
        <circle cx="128" cy="75" r="6" fill="#22c55e" opacity="0.7" />
        <text x="280" y="80" textAnchor="middle" fill="rgba(14,165,233,0.8)" fontSize="12" fontWeight="700" fontFamily="Inter, sans-serif">Platform Admin Console</text>

        {/* Company tiles grid */}
        <g transform="translate(85, 115)">
          <text x="0" y="12" fill="#64748b" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Companies</text>
          {[
            { x: 0, y: 22, label: 'Acme Corp', users: '24', color: '#0ea5e9', delay: '0s' },
            { x: 115, y: 22, label: 'TechFlow', users: '18', color: '#14b8a6', delay: '0.3s' },
            { x: 230, y: 22, label: 'DataSync', users: '31', color: '#8b5cf6', delay: '0.6s' },
            { x: 0, y: 72, label: 'CloudBase', users: '12', color: '#06b6d4', delay: '0.9s' },
            { x: 115, y: 72, label: 'NovaTech', users: '45', color: '#10b981', delay: '1.2s' },
            { x: 230, y: 72, label: 'SwiftAI', users: '8', color: '#0ea5e9', delay: '1.5s' },
          ].map(({ x, y, label, users, color, delay }) => (
            <g key={label}>
              <rect x={x} y={y} width="105" height="42" rx="10" fill="rgba(255,255,255,0.55)" stroke="rgba(14,165,233,0.12)" strokeWidth="1">
                <animate attributeName="opacity" values="0;1" dur="0.6s" begin={delay} fill="freeze" />
              </rect>
              <circle cx={x + 18} cy={y + 21} r="10" fill={color} opacity="0.7">
                <animate attributeName="opacity" values="0;0.7" dur="0.6s" begin={delay} fill="freeze" />
              </circle>
              <text x={x + 18} y={y + 25} textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="Inter, sans-serif">
                {label.charAt(0)}
              </text>
              <text x={x + 38} y={y + 17} fill="#334155" fontSize="9" fontWeight="600" fontFamily="Inter, sans-serif">{label}</text>
              <text x={x + 38} y={y + 30} fill="#94a3b8" fontSize="8" fontFamily="Inter, sans-serif">{users} users</text>
            </g>
          ))}
        </g>

        {/* Subscription bars */}
        <g transform="translate(85, 250)">
          <text x="0" y="12" fill="#64748b" fontSize="10" fontWeight="600" fontFamily="Inter, sans-serif">Subscription Health</text>
          {[
            { y: 22, w: 300, label: 'Enterprise', pct: '92%', color: '#0ea5e9', delay: '0.5s' },
            { y: 44, w: 240, label: 'Pro', pct: '74%', color: '#14b8a6', delay: '0.8s' },
            { y: 66, w: 160, label: 'Starter', pct: '49%', color: '#8b5cf6', delay: '1.1s' },
          ].map(({ y, w, label, pct, color, delay }) => (
            <g key={label}>
              <rect x="0" y={y} width="330" height="18" rx="5" fill="rgba(255,255,255,0.4)" />
              <rect x="0" y={y} width="0" height="18" rx="5" fill={color} opacity="0.6">
                <animate attributeName="width" values={`0;${w}`} dur="1.2s" begin={delay} fill="freeze" />
              </rect>
              <text x="6" y={y + 13} fill="#334155" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">{label}</text>
              <text x="320" y={y + 13} textAnchor="end" fill="#64748b" fontSize="8" fontWeight="600" fontFamily="Inter, sans-serif">{pct}</text>
            </g>
          ))}
        </g>

        {/* Security badge */}
        <g transform="translate(350, 115)">
          <circle cx="30" cy="30" r="28" fill="rgba(14,165,233,0.1)" stroke="rgba(14,165,233,0.3)" strokeWidth="1.5">
            <animate attributeName="r" values="28;30;28" dur="3s" repeatCount="indefinite" />
          </circle>
          <path d="M20,22 L30,16 L40,22 L40,34 C40,38 35,42 30,44 C25,42 20,38 20,34 Z" fill="rgba(14,165,233,0.3)" stroke="#0ea5e9" strokeWidth="1.5" />
          <path d="M26,30 L29,33 L35,27" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <animate attributeName="stroke-dasharray" values="0,20;20,0" dur="1s" begin="1.5s" fill="freeze" />
          </path>
        </g>

        {/* Notification pulse */}
        <circle cx="410" cy="70" r="12" fill="#0ea5e9" opacity="0.9">
          <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
        </circle>
        <text x="410" y="74" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="Inter, sans-serif">3</text>

        {/* Data flow lines */}
        <line x1="200" y1="345" x2="300" y2="345" stroke="rgba(14,165,233,0.25)" strokeWidth="1.5" strokeDasharray="6,4">
          <animate attributeName="stroke-dashoffset" values="0;-20" dur="2s" repeatCount="indefinite" />
        </line>

        {/* Admin avatars at bottom */}
        <g transform="translate(130, 355)" opacity="0.85">
          <circle cx="0" cy="0" r="14" fill="#0ea5e9" />
          <text x="0" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">A</text>
          <circle cx="32" cy="0" r="14" fill="#14b8a6" />
          <text x="32" y="5" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">P</text>
          <text x="60" y="5" fill="#64748b" fontSize="10" fontFamily="Inter, sans-serif">2 Platform Admins</text>
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

export default function PlatformLoginPage() {
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

      if (user.role !== 'PLATFORM_ADMIN') {
        throw new Error('Access denied. This login is reserved for Platform Administrators only.')
      }

      setPersistenceMode(rememberMe ? 'local' : 'session')
      login(user, accessToken, refreshToken)
      toast.success(`Welcome back, ${user?.name ?? 'Admin'}!`)
      navigate('/admin/saas')
    } catch (err) {
      toast.error(err?.message || 'Login failed. Check credentials.')
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

      {/* Left panel — Platform Animation */}
      <div className="hidden lg:flex flex-col w-1/2 relative">
        <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(14,165,233,0.85), rgba(20,184,166,0.85))',
              boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
            }}
          >
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-slate-800 font-bold text-lg leading-none">NexaCRM</p>
            <p className="text-brand-500 text-xs font-semibold tracking-widest uppercase">Platform Control</p>
          </div>
        </div>

        <PlatformAnimation />

        <div className="absolute bottom-8 left-8 right-8 z-20">
          <div className="flex gap-6">
            {[
              { value: '6', label: 'Companies' },
              { value: '138', label: 'Total Users' },
              { value: '99.9%', label: 'Uptime' },
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
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-slate-800 font-bold text-lg leading-none">NexaCRM</p>
              <p className="text-brand-500 text-xs font-semibold">Platform Control</p>
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
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
                <span className="text-[10px] font-bold text-brand-600 uppercase tracking-wider">Platform Admin</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Platform Sign In</h2>
              <p className="text-slate-500 text-sm mt-1">Access the SaaS administration console</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">Admin Email</label>
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
                  placeholder="admin@nexacrm.com"
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

              <div className="flex items-center text-xs">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-brand-500 focus:ring-brand-500/30"
                  />
                  Remember me
                </label>
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
                {loading ? 'Signing in…' : 'Sign In to Platform'}
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500 mt-6 space-y-1.5">
            <p>This login is restricted to Platform Administrators only.</p>
            <p>
              Company user? <Link to="/login" className="text-brand-500 hover:text-brand-600 font-semibold">Sign in here</Link>
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
