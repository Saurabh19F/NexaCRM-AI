import { useState, useRef, useEffect } from 'react'
import { Settings, Bell, Shield, Palette, Link, CreditCard, Save,
         ShieldCheck, ShieldOff, Copy, X, CheckCircle2,
         Smartphone, KeyRound, Eye, EyeOff, AlertTriangle,
         Globe, Plus, Trash2, Info, Wifi, Clock, Activity,
         LogIn, LogOut, UserCog, FileEdit, Trash, Download } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { key: 'general',       label: 'General',       icon: Settings },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security',      label: 'Security',      icon: Shield },
  { key: 'appearance',    label: 'Appearance',    icon: Palette },
  { key: 'integrations',  label: 'Integrations',  icon: Link },
  { key: 'billing',       label: 'Billing',       icon: CreditCard },
]

const INTEGRATIONS = [
  { name: 'Facebook / Instagram', status: 'connected', icon: '📘', color: 'bg-blue-50 dark:bg-blue-950/20' },
  { name: 'LinkedIn',             status: 'connected', icon: '💼', color: 'bg-sky-50 dark:bg-sky-950/20' },
  { name: 'WhatsApp Business',    status: 'connected', icon: '💬', color: 'bg-emerald-50 dark:bg-emerald-950/20' },
  { name: 'Gmail / Google',       status: 'connected', icon: '📧', color: 'bg-red-50 dark:bg-red-950/20' },
  { name: 'Google Calendar',      status: 'pending',   icon: '📅', color: 'bg-orange-50 dark:bg-orange-950/20' },
  { name: 'OpenAI GPT-4',         status: 'connected', icon: '🤖', color: 'bg-slate-50 dark:bg-slate-800/50' },
  { name: 'AWS S3',               status: 'connected', icon: '☁️', color: 'bg-amber-50 dark:bg-amber-950/20' },
  { name: 'Tally XML',            status: 'pending',   icon: '📊', color: 'bg-purple-50 dark:bg-purple-950/20' },
]

/* ── QR Code ─────────────────────────────────────────────────────── */
const MOCK_SECRET = 'NEXC RM7K 4B2P QX9A'
const MOCK_QR_CELLS = (() => {
  const size = 21
  const cells = []
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const finder = (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7)
      const timing = r === 6 || c === 6
      const data   = (r * 3 + c * 7 + r * c) % 3 === 0
      cells.push({ r, c, dark: finder || timing || data })
    }
  }
  return cells
})()

function QRCode() {
  const S = 21, C = 7
  return (
    <div style={{ display:'inline-block', background:'#fff', padding:'10px',
                  borderRadius:'10px', boxShadow:'0 2px 12px rgba(0,0,0,0.15)', lineHeight:0 }}>
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${S},${C}px)`,
                    gridTemplateRows:`repeat(${S},${C}px)`, width:S*C, height:S*C }}>
        {MOCK_QR_CELLS.map(({ r, c, dark }) => (
          <div key={r+'-'+c} style={{ width:C, height:C, backgroundColor: dark ? '#0f172a' : '#ffffff' }} />
        ))}
      </div>
    </div>
  )
}

/* ── 2FA Setup Modal ─────────────────────────────────────────────── */
function TwoFactorModal({ onClose, onConfirm }) {
  const [step, setStep]             = useState(1)
  const [otp, setOtp]               = useState(['','','','','',''])
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError]           = useState('')
  const inputRefs                   = useRef([])

  const handleChange = (val, idx) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[idx] = val; setOtp(next); setError('')
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus()
  }
  const handleKey = (e, idx) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) inputRefs.current[idx - 1]?.focus()
  }
  const copySecret = () => {
    navigator.clipboard.writeText(MOCK_SECRET.replace(/\s/g,''))
    toast.success('Secret key copied!')
  }
  const verify = () => {
    if (otp.join('').length < 6) { setError('Enter the full 6-digit code.'); return }
    setStep(3)
    setTimeout(() => { onConfirm(); onClose() }, 1200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
        exit={{ opacity:0, scale:0.95 }} transition={{ duration:0.2 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-600" />
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {step < 3 ? 'Enable Two-Factor Authentication' : '2FA Enabled!'}
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-center gap-2 mb-6">
            {['Scan QR','Verify','Done'].map((lbl, i) => (
              <div key={lbl} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all
                  ${step > i+1 ? 'bg-emerald-500 text-white' : step === i+1 ? 'bg-brand-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                  {step > i+1 ? <CheckCircle2 className="w-4 h-4" /> : i+1}
                </div>
                <span className={`text-xs font-medium ${step === i+1 ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>{lbl}</span>
                {i < 2 && <div className={`w-8 h-px ${step > i+1 ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} className="space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                    Scan this QR code with your authenticator app<br />
                    <span className="text-xs text-slate-400">(Google Authenticator, Authy, 1Password…)</span>
                  </p>
                  <QRCode />
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" /> Or enter this secret key manually:
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-sm font-bold tracking-widest text-slate-800 dark:text-slate-100 ${!showSecret ? 'blur-sm select-none' : ''}`}>
                      {MOCK_SECRET}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => setShowSecret(p => !p)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={copySecret} className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">Save this key somewhere safe — you'll need it if you lose your device.</p>
                </div>
                <button onClick={() => setStep(2)} className="btn-primary w-full justify-center gap-2">
                  <Smartphone className="w-4 h-4" /> I've Scanned the Code
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} className="space-y-5">
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Enter the 6-digit code from your authenticator app</p>
                  <p className="text-xs text-slate-400 mt-1">Code refreshes every 30 seconds</p>
                </div>
                <div className="flex justify-center gap-2">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => (inputRefs.current[i] = el)}
                      value={d} onChange={e => handleChange(e.target.value, i)} onKeyDown={e => handleKey(e, i)}
                      maxLength={1} inputMode="numeric"
                      className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none transition-all focus:ring-2 focus:ring-brand-500/20
                        ${error ? 'border-red-400' : d ? 'border-brand-400 bg-brand-50 dark:bg-brand-950/20' : 'border-slate-200 dark:border-slate-600'}`}
                    />
                  ))}
                </div>
                {error && <p className="text-xs text-red-500 text-center">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">Back</button>
                  <button onClick={verify} className="btn-primary flex-1 justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Verify & Enable
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="flex flex-col items-center gap-3 py-4">
                <motion.div initial={{ scale:0 }} animate={{ scale:1 }} transition={{ type:'spring', stiffness:200 }}
                  className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </motion.div>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">2FA Successfully Enabled!</p>
                <p className="text-sm text-slate-500 text-center">Your account is now protected with two-factor authentication.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Disable 2FA Confirm ─────────────────────────────────────────── */
function DisableModal({ onClose, onConfirm }) {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const confirm = () => {
    if (!password) { toast.error('Enter your password to confirm.'); return }
    onConfirm(); onClose()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <motion.div initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.95 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShieldOff className="w-5 h-5 text-red-500" />
            <span className="font-bold text-slate-800 dark:text-slate-100">Disable 2FA</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800/40">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-700 dark:text-red-400">Disabling 2FA removes the extra security layer. Make sure this is intentional.</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">Confirm your password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Enter current password" className="input pr-10" />
              <button onClick={() => setShowPwd(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button onClick={confirm} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
              <ShieldOff className="w-4 h-4" /> Disable 2FA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Session Timeout Panel ───────────────────────────────────────── */
const TIMEOUT_OPTIONS = [
  { label: '5 minutes',  value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour',     value: 60 },
  { label: '2 hours',    value: 120 },
  { label: 'Never',      value: 0 },
]

function SessionTimeoutPanel() {
  const [selected, setSelected] = useState(30)
  const [saved, setSaved]       = useState(30)

  const save = () => {
    setSaved(selected)
    toast.success(`Session timeout set to ${selected === 0 ? 'never' : selected + ' min'}.`)
  }

  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      exit={{ opacity:0, height:0 }} transition={{ duration:0.25 }} className="mt-4 space-y-3 overflow-hidden">

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Users will be automatically signed out after the selected period of inactivity.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TIMEOUT_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setSelected(opt.value)}
            className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all
              ${selected === opt.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'}`}>
            <Clock className="w-3 h-3 inline mr-1 opacity-70" />
            {opt.label}
          </button>
        ))}
      </div>

      {selected === 0 && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          className="flex items-start gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Sessions will never expire. Not recommended for shared devices.
          </p>
        </motion.div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-slate-400">
          Currently active: <span className="font-semibold text-slate-600 dark:text-slate-300">
            {saved === 0 ? 'Never' : `${saved} min`}
          </span>
        </span>
        <button onClick={save} disabled={selected === saved}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors">
          <Save className="w-3 h-3" /> Apply
        </button>
      </div>
    </motion.div>
  )
}

/* ── Audit Logs Panel ─────────────────────────────────────────────── */
const AUDIT_DATA = [
  { id:1,  action:'Login',           user:'Saurabh K.',   ip:'49.36.112.45',    time:'Today, 09:14 AM', type:'auth',   icon: LogIn },
  { id:2,  action:'Lead Created',    user:'Saurabh K.',   ip:'49.36.112.45',    time:'Today, 09:21 AM', type:'create', icon: FileEdit },
  { id:3,  action:'Deal Updated',    user:'Priya M.',     ip:'103.21.244.12',   time:'Today, 10:03 AM', type:'edit',   icon: FileEdit },
  { id:4,  action:'User Role Changed',user:'Admin',       ip:'192.168.1.5',     time:'Today, 11:30 AM', type:'admin',  icon: UserCog },
  { id:5,  action:'Lead Deleted',    user:'Rahul S.',     ip:'103.21.244.8',    time:'Today, 12:15 PM', type:'delete', icon: Trash },
  { id:6,  action:'Login',           user:'Priya M.',     ip:'103.21.244.12',   time:'Yesterday, 6:40 PM', type:'auth', icon: LogIn },
  { id:7,  action:'Logout',          user:'Saurabh K.',   ip:'49.36.112.45',    time:'Yesterday, 7:01 PM', type:'auth', icon: LogOut },
  { id:8,  action:'Settings Changed',user:'Admin',        ip:'192.168.1.5',     time:'Apr 28, 3:22 PM', type:'admin',  icon: UserCog },
]

const TYPE_STYLE = {
  auth:   'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
  create: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  edit:   'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
  delete: 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400',
  admin:  'bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
}

function AuditLogsPanel() {
  const [filter, setFilter]   = useState('all')
  const [search, setSearch]   = useState('')

  const filters = ['all', 'auth', 'create', 'edit', 'delete', 'admin']

  const visible = AUDIT_DATA.filter(e =>
    (filter === 'all' || e.type === filter) &&
    (search === '' || e.action.toLowerCase().includes(search.toLowerCase()) ||
                      e.user.toLowerCase().includes(search.toLowerCase()))
  )

  const exportCSV = () => {
    const rows = ['Action,User,IP,Time', ...visible.map(e => `${e.action},${e.user},${e.ip},${e.time}`)]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'audit-log.csv'; a.click()
    toast.success('Audit log exported.')
  }

  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      exit={{ opacity:0, height:0 }} transition={{ duration:0.25 }} className="mt-4 space-y-3 overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search actions or users…"
          className="input text-xs flex-1 min-w-[160px]" />
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-all
              ${filter === f ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Log table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 grid grid-cols-[auto_1fr_auto_auto] gap-4 border-b border-slate-200 dark:border-slate-700">
              {['Action','User','IP Address','Time'].map(h => (
                <span key={h} className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</span>
              ))}
            </div>

            {visible.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No matching log entries.</p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto">
                {visible.map(entry => {
                  const Icon = entry.icon
                  return (
                    <div key={entry.id} className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-4 py-2.5 items-center border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLE[entry.type]}`}>
                        <Icon className="w-3 h-3" /> {entry.action}
                      </div>
                      <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">{entry.user}</span>
                      <span className="text-xs font-mono text-slate-400">{entry.ip}</span>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{entry.time}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

      <p className="text-xs text-slate-400">Showing {visible.length} of {AUDIT_DATA.length} events · Logs retained for 90 days</p>
    </motion.div>
  )
}

/* ── IP Whitelist Panel ───────────────────────────────────────────── */
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
const DEFAULT_IPS = [
  { id: 1, ip: '103.21.244.0/22', label: 'Office — Mumbai HQ', added: '2026-01-10' },
  { id: 2, ip: '192.168.1.0/24',  label: 'Internal VPN',       added: '2026-02-03' },
  { id: 3, ip: '49.36.112.45',    label: 'Saurabh — Home',     added: '2026-03-15' },
]

function IPWhitelistPanel() {
  const [ips, setIps]           = useState(DEFAULT_IPS)
  const [newIp, setNewIp]       = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError]       = useState('')
  const [myIp, setMyIp]         = useState('Detecting…')
  const [deleteId, setDeleteId] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setMyIp('49.36.112.45'), 800)
    return () => clearTimeout(t)
  }, [])

  const validate = (val) => {
    if (!val.trim()) return 'IP address is required.'
    if (!IP_REGEX.test(val.trim())) return 'Enter a valid IP or CIDR (e.g. 10.0.0.0/8).'
    if (ips.some(e => e.ip === val.trim())) return 'This IP is already in the list.'
    if (val.split('/')[0].split('.').some(p => parseInt(p) > 255)) return 'IP octet cannot exceed 255.'
    return ''
  }

  const addIp = () => {
    const err = validate(newIp)
    if (err) { setError(err); return }
    setIps(prev => [...prev, { id: Date.now(), ip: newIp.trim(), label: newLabel.trim() || 'Unlabeled', added: new Date().toISOString().slice(0,10) }])
    setNewIp(''); setNewLabel(''); setError('')
    toast.success('IP address added to whitelist.')
  }

  const removeIp = (id) => {
    setIps(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
    toast('IP removed from whitelist.', { icon: '🗑️' })
  }

  return (
    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}
      exit={{ opacity:0, height:0 }} transition={{ duration:0.25 }} className="mt-3 space-y-4 overflow-hidden">

      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800/40">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Only these IPs can access your account. Supports single IPs and CIDR notation.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <Wifi className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500">Your current IP:</span>
          <span className={`text-xs font-mono font-bold text-slate-700 dark:text-slate-300 ${myIp === 'Detecting…' ? 'animate-pulse' : ''}`}>{myIp}</span>
        </div>
        <button onClick={() => { if (myIp !== 'Detecting…') { setNewIp(myIp); setError('') } }}
          disabled={myIp === 'Detecting…'}
          className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          + Use this IP
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2 flex items-center justify-between border-b border-slate-200 dark:border-slate-700">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Whitelisted IPs ({ips.length})</span>
          <span className="text-xs text-slate-400">Added on</span>
        </div>
        {ips.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Globe className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No IPs whitelisted yet.</p>
          </div>
        ) : (
          <AnimatePresence>
            {ips.map(entry => (
              <motion.div key={entry.id} initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">{entry.ip}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{entry.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs text-slate-400 hidden group-hover:block">{entry.added}</span>
                  {deleteId === entry.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">Confirm?</span>
                      <button onClick={() => removeIp(entry.id)} className="text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-0.5 rounded-lg bg-red-50 dark:bg-red-950/30 transition-colors">Remove</button>
                      <button onClick={() => setDeleteId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Add IP Address</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 space-y-1.5">
            <input value={newIp} onChange={e => { setNewIp(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && addIp()}
              placeholder="e.g. 203.0.113.5 or 10.0.0.0/8"
              className="input font-mono text-sm" />
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addIp()}
              placeholder="Label (e.g. Office Wi-Fi)"
              className="input text-sm" />
          </div>
          <button onClick={addIp} className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors self-start">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        {error && (
          <motion.p initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="text-xs text-red-500 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> {error}
          </motion.p>
        )}
      </div>
    </motion.div>
  )
}

/* ── Manage Plan Modal ───────────────────────────────────────────── */
const PLANS = [
  { name: 'Starter',    price: '₹799',  period: '/month', users: 1,  features: ['Up to 500 leads','Basic pipeline','Email support'] },
  { name: 'Growth',     price: '₹1,499',period: '/month', users: 3,  features: ['Up to 5,000 leads','AI Engine (basic)','WhatsApp integration','Priority support'] },
  { name: 'Enterprise', price: '₹2,499',period: '/month', users: 5,  features: ['Unlimited leads & deals','AI Engine (GPT-4)','All integrations','Dedicated support','Custom reports','White-labeling'], current: true },
  { name: 'Custom',     price: 'Contact',period: '',      users: 999, features: ['Unlimited everything','Custom SLA','On-premise option','API access','Custom training'] },
]

function ManagePlanModal({ onClose }) {
  const [selected, setSelected] = useState('Enterprise')

  const handleUpgrade = () => {
    if (selected === 'Custom') {
      toast.success('Our team will contact you within 24 hours.')
    } else {
      toast.success(`Switched to ${selected} plan — billing updated.`)
    }
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Manage Plan</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map((plan) => (
            <button key={plan.name} onClick={() => setSelected(plan.name)}
              className={`text-left rounded-xl border-2 p-4 transition-all
                ${selected === plan.name
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-brand-300'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-slate-800 dark:text-slate-200">{plan.name}</p>
                {plan.current && <span className="text-[10px] bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400 font-semibold px-2 py-0.5 rounded-full">Current</span>}
              </div>
              <p className="text-xl font-extrabold text-brand-600 dark:text-brand-400">{plan.price}<span className="text-xs font-medium text-slate-400">{plan.period}</span></p>
              <p className="text-xs text-slate-500 mb-2">{plan.users < 999 ? `${plan.users} users included` : 'Unlimited users'}</p>
              <ul className="space-y-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="w-3 h-3 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center flex-shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleUpgrade} className="btn-primary flex-1 text-sm">
            {selected === 'Custom' ? 'Contact Sales' : selected === 'Enterprise' ? 'Keep Current Plan' : `Switch to ${selected}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Settings Page ──────────────────────────────────────────── */
export default function SettingsPage() {
  const [tab, setTab]               = useState('general')
  const { isDark, toggleTheme }     = useThemeStore()
  const [twoFAEnabled, setTwoFAEnabled]     = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(true)
  const [auditLogs, setAuditLogs]           = useState(true)
  const [ipWhitelist, setIpWhitelist]       = useState(false)
  const [integrations, setIntegrations]     = useState(INTEGRATIONS)
  const [showPlanModal, setShowPlanModal]   = useState(false)

  const handle2FAToggle = () => twoFAEnabled ? setShowDisableModal(true) : setShowSetupModal(true)
  const save = () => toast.success('Settings saved!')

  const toggleIntegration = (name) => {
    setIntegrations((prev) =>
      prev.map((intg) => {
        if (intg.name !== name) return intg
        const next = intg.status === 'connected' ? 'pending' : 'connected'
        toast(next === 'connected' ? `${name} connected` : `${name} disconnected`, { icon: next === 'connected' ? '✅' : '🔌' })
        return { ...intg, status: next }
      })
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-48 lg:flex-shrink-0">
          <nav className="flex lg:block gap-1 overflow-x-auto custom-scrollbar">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`nav-item whitespace-nowrap lg:w-full ${tab === key ? 'active' : ''}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 glass-card p-4 sm:p-6">

          {tab === 'general' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">General Settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Company Name', value: 'NexaCRM Demo Co.' },
                  { label: 'Timezone',     value: 'Asia/Kolkata (IST)' },
                  { label: 'Currency',     value: 'INR (₹)' },
                  { label: 'Language',     value: 'English' },
                  { label: 'Date Format',  value: 'DD/MM/YYYY' },
                  { label: 'Fiscal Year',  value: 'April – March' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">{label}</label>
                    <input defaultValue={value} className="input" />
                  </div>
                ))}
              </div>
              <button onClick={save} className="btn-primary gap-2"><Save className="w-4 h-4" /> Save Changes</button>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Notification Preferences</h2>
              {[
                { label: 'New Lead',           channels: ['Email','In-App','WhatsApp'] },
                { label: 'Deal Update',        channels: ['Email','In-App'] },
                { label: 'Follow-up Reminder', channels: ['Email','In-App','Push'] },
                { label: 'Invoice Overdue',    channels: ['Email','WhatsApp'] },
                { label: 'AI Insights',        channels: ['In-App'] },
              ].map(({ label, channels }) => (
                <div key={label} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
                  <div className="flex flex-wrap gap-2">
                    {['Email','In-App','Push','WhatsApp'].map(ch => (
                      <label key={ch} className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                        <input type="checkbox" defaultChecked={channels.includes(ch)} className="rounded" /> {ch}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={save} className="btn-primary gap-2"><Save className="w-4 h-4" /> Save</button>
            </div>
          )}

          {tab === 'appearance' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Appearance</h2>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Theme</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  {[
                    { label:'Light', active:!isDark, fn:() => isDark  && toggleTheme() },
                    { label:'Dark',  active: isDark, fn:() => !isDark && toggleTheme() },
                  ].map(({ label, active, fn }) => (
                    <button key={label} onClick={fn}
                      className={`flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-6 rounded-2xl border-2 text-sm font-semibold transition-all
                        ${active ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-400' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>
                      {label === 'Light' ? '☀️' : '🌙'} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'integrations' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Integrations</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {integrations.map(intg => (
                  <div key={intg.name} className={`rounded-xl p-4 ${intg.color} flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{intg.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{intg.name}</p>
                        <p className={`text-xs font-medium ${intg.status === 'connected' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {intg.status === 'connected' ? '● Connected' : '◌ Pending'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => toggleIntegration(intg.name)}
                      className={`text-xs font-semibold hover:underline transition-colors ${intg.status === 'connected' ? 'text-red-500 hover:text-red-600' : 'text-brand-600 dark:text-brand-400 hover:text-brand-700'}`}>
                      {intg.status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Security</h2>

              <div className={`rounded-2xl border-2 p-5 transition-all
                ${twoFAEnabled ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                               : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${twoFAEnabled ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      {twoFAEnabled ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Two-Factor Authentication (2FA)</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${twoFAEnabled ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400'
                                         : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${twoFAEnabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {twoFAEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Add an extra layer of security using an authenticator app.</p>
                      {twoFAEnabled && (
                        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="mt-3 flex items-center gap-2">
                          <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Authenticator app active</span>
                          <span className="text-xs text-slate-400">· last verified today</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <button onClick={handle2FAToggle}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                      ${twoFAEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <motion.div animate={{ x: twoFAEnabled ? 24 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
                {!twoFAEnabled && (
                  <motion.button initial={{ opacity:0 }} animate={{ opacity:1 }} onClick={() => setShowSetupModal(true)}
                    className="mt-4 flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 transition-colors">
                    <ShieldCheck className="w-3.5 h-3.5" /> Set up 2FA now →
                  </motion.button>
                )}
              </div>

              {/* Session Timeout Card */}
              <div className={`rounded-2xl border-2 p-5 transition-all
                ${sessionTimeout ? 'border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-950/10'
                                 : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${sessionTimeout ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Session Timeout</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${sessionTimeout ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400'
                                           : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sessionTimeout ? 'bg-violet-500' : 'bg-slate-400'}`} />
                          {sessionTimeout ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Automatically sign out inactive users after a set period.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setSessionTimeout(p => !p); toast(sessionTimeout ? 'Session timeout disabled.' : 'Session timeout enabled.') }}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                      ${sessionTimeout ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <motion.div animate={{ x: sessionTimeout ? 24 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
                <AnimatePresence>
                  {sessionTimeout && <SessionTimeoutPanel />}
                </AnimatePresence>
              </div>

              {/* Audit Logs Card */}
              <div className={`rounded-2xl border-2 p-5 transition-all
                ${auditLogs ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/10'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${auditLogs ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Audit Logs</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${auditLogs ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${auditLogs ? 'bg-amber-500' : 'bg-slate-400'}`} />
                          {auditLogs ? 'Recording' : 'Paused'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Track all user actions — logins, changes, deletions — with timestamps and IPs.
                      </p>
                    </div>
                  </div>
                  <button onClick={() => { setAuditLogs(p => !p); toast(auditLogs ? 'Audit logging paused.' : 'Audit logging enabled.', { icon: auditLogs ? '⏸️' : '▶️' }) }}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                      ${auditLogs ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <motion.div animate={{ x: auditLogs ? 24 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
                <AnimatePresence>
                  {auditLogs && <AuditLogsPanel />}
                </AnimatePresence>
              </div>

              <div className={`rounded-2xl border-2 p-5 transition-all
                ${ipWhitelist ? 'border-brand-400 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-950/10'
                              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                      ${ipWhitelist ? 'bg-brand-100 dark:bg-brand-900/40 text-brand-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">IP Whitelist</p>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                          ${ipWhitelist ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-700 dark:text-brand-400'
                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${ipWhitelist ? 'bg-brand-500' : 'bg-slate-400'}`} />
                          {ipWhitelist ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Restrict access to specific IP addresses or CIDR ranges.</p>
                    </div>
                  </div>
                  <button onClick={() => { const n = !ipWhitelist; setIpWhitelist(n); n ? toast('IP Whitelist enabled.', { icon:'🌐' }) : toast('IP Whitelist disabled.') }}
                    className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                      ${ipWhitelist ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <motion.div animate={{ x: ipWhitelist ? 24 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                      className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md" />
                  </button>
                </div>
                <AnimatePresence>
                  {ipWhitelist && <IPWhitelistPanel />}
                </AnimatePresence>
              </div>
            </div>
          )}

          {tab === 'billing' && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Billing & Plan</h2>
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-80">Current Plan</p>
                <p className="text-3xl font-bold mt-1">Enterprise</p>
                <p className="text-sm opacity-80 mt-1">₹2,499/month · Billed annually · 5 users included</p>
                <button onClick={() => setShowPlanModal(true)} className="mt-4 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">Manage Plan</button>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Plan Features</p>
                {['Unlimited leads & deals','AI Engine (GPT-4)','All integrations','Priority support','Custom reports','White-labeling'].map(f => (
                  <div key={f} className="flex items-center gap-2 py-2 text-sm text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <AnimatePresence>
        {showSetupModal && (
          <TwoFactorModal
            onClose={() => setShowSetupModal(false)}
            onConfirm={() => { setTwoFAEnabled(true); toast.success('2FA enabled!', { icon:'🔐' }) }}
          />
        )}
        {showDisableModal && (
          <DisableModal
            onClose={() => setShowDisableModal(false)}
            onConfirm={() => { setTwoFAEnabled(false); toast('2FA disabled.', { icon:'⚠️' }) }}
          />
        )}
        {showPlanModal && (
          <ManagePlanModal onClose={() => setShowPlanModal(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
