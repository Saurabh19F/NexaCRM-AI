import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

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
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#eaf7ff] px-4 py-4 text-slate-950 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/80 bg-white shadow-[0_20px_54px_rgba(15,23,42,0.14)] md:h-[540px] md:grid-cols-[1.05fr_0.95fr]"
      >
        {/* Left — illustration */}
        <div className="relative h-[260px] overflow-hidden bg-[#f6fbff] md:h-full">
          <img
            src="/login-crm-side.png"
            alt="CRM dashboard illustration"
            className="h-full w-full object-cover object-center"
          />
        </div>

        {/* Right — form */}
        <div className="flex min-h-[420px] flex-col justify-center px-7 py-8 sm:px-10 md:min-h-0 lg:px-14">
          <Link
            to="/"
            className="mb-7 inline-flex w-fit items-center gap-2 text-sm font-extrabold text-slate-900"
            aria-label="Go to NexaCRM home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00a8b8] text-white shadow-sm shadow-cyan-700/20">
              <Sparkles size={16} strokeWidth={2.4} />
            </span>
            NexaCRM
          </Link>

          <div className="w-full max-w-sm">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Login</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your details to access your CRM workspace.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {/* Email */}
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Email</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-500 transition focus-within:border-[#00a8b8] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#00a8b8]/10">
                  <Mail size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </span>
              </label>

              {/* Password */}
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Password</span>
                <span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-500 transition focus-within:border-[#00a8b8] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#00a8b8]/10">
                  <Lock size={17} />
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                    required
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {/* Remember me + forgot */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#00a8b8] focus:ring-[#00a8b8]/30"
                  />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => toast('Password resets are handled by your admin or identity provider.')}
                  className="text-[#00a8b8] hover:text-[#0891b2] font-semibold"
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#00a8b8] text-sm font-extrabold text-white shadow-[0_14px_28px_rgba(0,168,184,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0891b2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00a8b8]/40 focus-visible:ring-offset-2 disabled:opacity-70 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="mt-6 space-y-1.5 text-center text-xs text-slate-500">
              <p>
                Need access?{' '}
                <Link to="/register" className="text-[#00a8b8] hover:text-[#0891b2] font-semibold">Request an invite</Link>
              </p>
              <p>
                Platform Admin?{' '}
                <Link to="/platform/login" className="text-[#00a8b8] hover:text-[#0891b2] font-semibold">Sign in here</Link>
              </p>
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  )
}
