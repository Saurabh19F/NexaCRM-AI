import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, LogIn, Server, Users, BarChart3, Lock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 flex">
      {/* Left panel — Platform branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-500/8 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">NexaCRM</p>
              <p className="text-indigo-400 text-xs font-semibold tracking-widest uppercase">Platform Control</p>
            </div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Platform<br />
            <span className="text-indigo-400">Administration Console</span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Manage companies, users, subscriptions, security, and the entire SaaS platform from one place.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { icon: Server, label: 'Multi-tenant Management', desc: 'Companies & subscriptions' },
              { icon: Users, label: 'User Administration', desc: 'Cross-tenant user control' },
              { icon: BarChart3, label: 'Platform Analytics', desc: 'Usage & revenue insights' },
              { icon: Lock, label: 'Security & Compliance', desc: '2FA, audit logs, policies' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <Icon className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs text-slate-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-sm relative">© 2026 NexaCRM — Platform Administration</p>
      </div>

      {/* Right panel — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">NexaCRM</p>
              <p className="text-indigo-400 text-xs">Platform Control</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/25">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Platform Admin</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Platform Sign In</h2>
            <p className="text-slate-400 text-sm mt-1">Access the SaaS administration console</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Admin Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
                className="w-full rounded-xl border border-slate-600/50 bg-slate-800/50 text-white placeholder:text-slate-500 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/70 transition-all"
                placeholder="admin@nexacrm.com"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password"
                  className="w-full rounded-xl border border-slate-600/50 bg-slate-800/50 text-white placeholder:text-slate-500 px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/70 transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-600"
                />
                Remember me
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 text-base gap-2 disabled:opacity-70 flex items-center justify-center font-semibold rounded-xl text-white transition-all bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25">
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {loading ? 'Signing in…' : 'Sign In to Platform'}
            </button>
          </form>

          <div className="text-center text-xs text-slate-500 space-y-2">
            <p>This login is restricted to Platform Administrators only.</p>
            <p>
              Company user? <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">Sign in here</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
