import { Fragment, useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Download, Upload, Trash2,
  Edit, ChevronUp, ChevronDown, Flame, Thermometer,
  Snowflake, ExternalLink, X, History,
  PhoneCall, Mail, MessageSquare, UserCheck,
  FileText, DollarSign, AlertCircle, Building2,
  Tag, Calendar, User, Phone, AtSign, TrendingUp, ClipboardList, MessageCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import LeadActivitiesModal from '../../components/LeadActivitiesModal'
import { sendWhatsApp, WA_CONFIGURED } from '../../utils/whatsapp'
import { useLeadsStore } from '../../store/leadsStore'
import { useAuthStore } from '../../store/authStore'
import { getLeadAgingMeta, getLeadAgeMinutes } from '../../utils/leadSla'
import { leadsAPI } from '../../services/api'
import { PERMISSIONS, hasPermission } from '../../utils/permissions'

const SCORE_BADGE = {
  hot:  { label: 'Hot',  icon: Flame,       cls: 'badge-hot' },
  warm: { label: 'Warm', icon: Thermometer, cls: 'badge-warm' },
  cold: { label: 'Cold', icon: Snowflake,   cls: 'badge-cold' },
}

const STATUS_BADGE = {
  new:          { label: 'New',          cls: 'badge-new' },
  contacted:    { label: 'Contacted',    cls: 'badge bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' },
  qualified:    { label: 'Qualified',    cls: 'badge bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  proposal:     { label: 'Proposal',     cls: 'badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  negotiation:  { label: 'Negotiation',  cls: 'badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  won:          { label: 'Won',          cls: 'badge-won' },
  lost:         { label: 'Lost',         cls: 'badge-lost' },
}

function AddLeadModal({ onClose, onAdd }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', service: '', specialization: '',
    source: 'Website', score: 'warm', status: 'new',
    assignedTo: '', value: '', tags: ''
  })
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    const now = new Date()
    onAdd({
      ...form,
      id: Date.now(),
      createdAt: now.toISOString().split('T')[0],
      createdAtTs: now.toISOString(),
      followUpSlaMinutes: 60,
      value: Number(form.value) || 0,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative glass-card w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Add New Lead</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="input" placeholder="Ramesh Patel" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Company</label>
              <input name="company" value={form.company} onChange={handleChange} className="input" placeholder="Tech Corp" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="input" placeholder="ramesh@techcorp.in" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input" placeholder="+91-98765-43210" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Service</label>
              <input name="service" value={form.service} onChange={handleChange} className="input" placeholder="CRM Setup" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Specialization</label>
              <input name="specialization" value={form.specialization} onChange={handleChange} className="input" placeholder="Lead Automation" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Source</label>
              <select name="source" value={form.source} onChange={handleChange} className="input">
                {['Facebook','Instagram','LinkedIn','Website','WhatsApp','Google Ads','Referral'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Deal Value (₹)</label>
              <input name="value" type="number" value={form.value} onChange={handleChange} className="input" placeholder="100000" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">AI Score</label>
              <select name="score" value={form.score} onChange={handleChange} className="input">
                <option value="hot">🔥 Hot</option>
                <option value="warm">🌡️ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                {['new','contacted','qualified','proposal','negotiation','won','lost'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Assigned To</label>
            <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="input">
              <option value="">Unassigned</option>
              {['Priya S.', 'Rahul M.', 'Amit K.'].map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Tags (comma separated)</label>
            <input name="tags" value={form.tags} onChange={handleChange} className="input" placeholder="enterprise, priority" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Add Lead</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Edit Lead Modal ─────────────────────────────────────────────── */
function EditLeadModal({ lead, onClose, onSave }) {
  const [form, setForm] = useState({ ...lead })
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ ...form, value: Number(form.value) || 0 })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative glass-card w-full max-w-lg p-6 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Edit Lead</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
              <input name="name" value={form.name} onChange={handleChange} required className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Company</label>
              <input name="company" value={form.company} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email *</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone</label>
              <input name="phone" value={form.phone || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Service</label>
              <input name="service" value={form.service || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Specialization</label>
              <input name="specialization" value={form.specialization || ''} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Source</label>
              <select name="source" value={form.source} onChange={handleChange} className="input">
                {['Facebook','Instagram','LinkedIn','Website','WhatsApp','Google Ads','Referral'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Deal Value (₹)</label>
              <input name="value" type="number" value={form.value} onChange={handleChange} className="input" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">AI Score</label>
              <select name="score" value={form.score} onChange={handleChange} className="input">
                <option value="hot">🔥 Hot</option>
                <option value="warm">🌡️ Warm</option>
                <option value="cold">❄️ Cold</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleChange} className="input">
                {['new','contacted','qualified','proposal','negotiation','won','lost'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Assigned To</label>
            <select name="assignedTo" value={form.assignedTo} onChange={handleChange} className="input">
              <option value="">Unassigned</option>
              {['Priya S.','Rahul M.','Amit K.'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1 gap-2"><Edit className="w-3.5 h-3.5" /> Save Changes</button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Lead Detail Modal ───────────────────────────────────────────── */
function LeadDetailModal({ lead, onClose, onEdit, onDelete, canEdit, canDelete }) {
  const scoreCfg  = SCORE_BADGE[lead.score]
  const statusCfg = STATUS_BADGE[lead.status] ?? { label: lead.status, cls: 'badge' }
  const ScoreIcon = scoreCfg?.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative glass-card w-full max-w-lg p-0 z-10 overflow-hidden">

        {/* Header banner */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{lead.name}</h2>
              <p className="text-brand-200 text-sm mt-0.5">{lead.company}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className={`${scoreCfg?.cls} text-xs`}>{ScoreIcon && <ScoreIcon className="w-3 h-3" />} {scoreCfg?.label}</span>
                <span className={`${statusCfg.cls} text-xs`}>{statusCfg.label}</span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Details grid */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: AtSign,    label: 'Email',    value: lead.email },
              { icon: Phone,     label: 'Phone',    value: lead.phone || '—' },
              { icon: Building2, label: 'Company',  value: lead.company },
              { icon: Tag,       label: 'Service',  value: lead.service || '—' },
              { icon: Tag,       label: 'Specialization', value: lead.specialization || '—' },
              { icon: Tag,       label: 'Source',   value: lead.source },
              { icon: DollarSign,label: 'Value',    value: `₹${(lead.value/1000).toFixed(0)}k` },
              { icon: User,      label: 'Owner',    value: lead.assignedTo || 'Unassigned' },
              { icon: TrendingUp,label: 'AI Score', value: scoreCfg?.label },
              { icon: Calendar,  label: 'Added',    value: lead.createdAt },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {lead.tags && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {String(lead.tags).split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 text-xs font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            {canEdit && (
              <button onClick={() => { onClose(); onEdit(lead) }}
                className="btn-secondary flex-1 justify-center gap-2 text-xs">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => { onDelete([lead.id]); onClose() }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-500 text-xs font-semibold transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const HISTORY_EVENTS = [
  { type: 'call',    icon: PhoneCall,     color: 'text-blue-500   bg-blue-100   dark:bg-blue-950/40',   label: 'Call Made',          note: 'Discussed product demo. Lead is interested.',         time: 'Today, 10:30 AM' },
  { type: 'email',   icon: Mail,          color: 'text-violet-500 bg-violet-100 dark:bg-violet-950/40', label: 'Email Sent',         note: 'Sent proposal document and pricing sheet.',           time: 'Today, 09:15 AM' },
  { type: 'message', icon: MessageSquare, color: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-950/40', label: 'WhatsApp Message', note: 'Follow-up message sent via WhatsApp.',               time: 'Yesterday, 4:45 PM' },
  { type: 'status',  icon: UserCheck,     color: 'text-amber-500  bg-amber-100  dark:bg-amber-950/40',  label: 'Status Changed',     note: 'Status updated from New → Contacted.',                time: 'Yesterday, 2:00 PM' },
  { type: 'note',    icon: FileText,      color: 'text-slate-500  bg-slate-100  dark:bg-slate-800',     label: 'Note Added',         note: 'Client prefers morning calls. Budget ≈ ₹2L.',          time: 'Apr 28, 11:00 AM' },
  { type: 'deal',    icon: DollarSign,    color: 'text-green-500  bg-green-100  dark:bg-green-950/40',  label: 'Deal Value Updated', note: 'Deal value revised to ₹1,80,000.',                    time: 'Apr 27, 3:20 PM' },
  { type: 'alert',   icon: AlertCircle,   color: 'text-red-500    bg-red-100    dark:bg-red-950/40',    label: 'Follow-up Overdue',  note: 'Scheduled follow-up was missed.',                     time: 'Apr 26, 9:00 AM' },
]

function LeadHistoryPanel({ lead, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end">
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Drawer */}
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative z-10 w-full max-w-sm h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center flex-shrink-0">
              <History className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{lead.name}</p>
              <p className="text-xs text-slate-400">{lead.company} · Activity History</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-px bg-slate-200 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-700">
          {[
            { label: 'Activities', value: HISTORY_EVENTS.length },
            { label: 'Calls',      value: HISTORY_EVENTS.filter(e => e.type === 'call').length },
            { label: 'Emails',     value: HISTORY_EVENTS.filter(e => e.type === 'email').length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-slate-900 px-4 py-3 text-center">
              <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1 custom-scrollbar">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Timeline</p>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="space-y-4">
              {HISTORY_EVENTS.map((event, i) => {
                const Icon = event.icon
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-4 relative">
                    {/* Icon dot */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center z-10 ${event.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{event.label}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{event.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{event.note}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700">
          <button className="btn-primary w-full justify-center gap-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> Log Activity
          </button>
        </div>
      </motion.div>
    </div>
  )
}

const WA_TEMPLATES = [
  { label: '👋 Welcome', text: 'Hi {name}! Welcome to our services. We\'re excited to connect with you. How can we help you today?' },
  { label: '📞 Follow Up', text: 'Hi {name}, this is a quick follow-up from our earlier conversation. Are you available for a brief call to discuss your requirements?' },
  { label: '💼 Proposal', text: 'Hi {name}, we\'ve prepared a customized proposal based on your needs. Would you like to schedule a meeting to walk you through the details?' },
  { label: '🎉 Thank You', text: 'Hi {name}, thank you for your time today! It was great speaking with you. We\'ll send over the next steps shortly.' },
]

function WhatsAppModal({ lead, onClose }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const applyTemplate = (tpl) => {
    setMessage(tpl.text.replace('{name}', lead.name?.split(' ')[0] || 'there'))
  }

  const handleSend = async () => {
    if (!message.trim()) { toast.error('Please enter a message'); return }
    const phone = lead.phone || ''
    if (!phone) { toast.error('No phone number for this lead'); return }
    setSending(true)
    try {
      await sendWhatsApp(phone, message)
      setSent(true)
      toast.success(`WhatsApp sent to ${lead.name}!`)
      setTimeout(onClose, 1500)
    } catch (err) {
      toast.error(err.message || 'Failed to send WhatsApp message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-green-500 to-emerald-600">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">{lead.name}</p>
            <p className="text-green-100 text-xs">{lead.phone || 'No phone on file'}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Quick Templates */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Quick Templates</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WA_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={() => applyTemplate(tpl)}
                  className="text-left px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-xs text-slate-700 dark:text-slate-300 font-medium"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Message</p>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your WhatsApp message here..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
            />
            <p className="text-right text-[10px] text-slate-400 mt-1">{message.length} chars</p>
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || sent || !lead.phone}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              sent
                ? 'bg-green-500 text-white cursor-default'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Sending…
              </>
            ) : sent ? (
              <>✓ Sent!</>
            ) : (
              <>
                <MessageCircle className="w-4 h-4" />
                Send WhatsApp
              </>
            )}
          </button>

          {!lead.phone && (
            <p className="text-center text-xs text-amber-500 dark:text-amber-400">
              ⚠️ This lead has no phone number saved. Add a phone number first.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function LeadsPage() {
  const { user } = useAuthStore()
  const {
    leads,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    bulkDelete,
  } = useLeadsStore()
  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('createdAt')
  const [sortDir, setSortDir] = useState('desc')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected]         = useState([])
  const [historyLead, setHistoryLead]       = useState(null)
  const [editLead, setEditLead]             = useState(null)
  const [detailLead, setDetailLead]         = useState(null)
  const [activitiesLead, setActivitiesLead] = useState(null)
  const [waLead, setWaLead]                 = useState(null)
  const [expandedLeadId, setExpandedLeadId] = useState(null)
  const [timeTick, setTimeTick]             = useState(Date.now())
  const importRef                           = useRef(null)
  const canCreate = hasPermission(user, PERMISSIONS.LEADS_CREATE)
  const canUpdate = hasPermission(user, PERMISSIONS.LEADS_UPDATE)
  const canDelete = hasPermission(user, PERMISSIONS.LEADS_DELETE)
  const canImport = hasPermission(user, PERMISSIONS.LEADS_IMPORT)
  const canExport = hasPermission(user, PERMISSIONS.LEADS_EXPORT)

  useEffect(() => {
    const id = window.setInterval(() => setTimeTick(Date.now()), 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    fetchLeads().catch((err) => {
      toast.error(err?.message || 'Failed to load leads')
    })
  }, [fetchLeads])

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleExpandedLead = (leadId) => {
    setExpandedLeadId((prev) => (prev === leadId ? null : leadId))
  }

  const filtered = leads
    .filter((l) => {
      const q = search.toLowerCase()
      const matchSearch = !q
        || l.name.toLowerCase().includes(q)
        || l.email.toLowerCase().includes(q)
        || l.company.toLowerCase().includes(q)
        || String(l.phone || '').toLowerCase().includes(q)
        || String(l.service || '').toLowerCase().includes(q)
        || String(l.specialization || '').toLowerCase().includes(q)
      const matchScore = scoreFilter === 'all' || l.score === scoreFilter
      const matchStatus = statusFilter === 'all' || l.status === statusFilter
      return matchSearch && matchScore && matchStatus
    })
    .sort((a, b) => {
      let va = a[sortField], vb = b[sortField]
      if (typeof va === 'string') va = va.toLowerCase(), vb = vb.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const SortIcon = ({ field }) =>
    sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null

  const toggleSelect = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map((l) => l.id))

  const handleAdd = async (lead) => {
    if (!canCreate) {
      toast.error('You do not have permission to add leads.')
      return
    }
    try {
      await createLead(lead)
      toast.success('Lead added successfully!')
    } catch (err) {
      toast.error(err?.message || 'Failed to add lead')
    }
  }

  const handleSave = async (updated) => {
    if (!canUpdate) {
      toast.error('You do not have permission to edit leads.')
      return
    }
    try {
      await updateLead(updated.id, updated)
      toast.success('Lead updated successfully!')
    } catch (err) {
      toast.error(err?.message || 'Failed to update lead')
    }
  }

  const handleDelete = async (ids) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete leads.')
      return
    }
    try {
      if (ids.length === 1) {
        await deleteLead(ids[0])
      } else {
        await bulkDelete(ids)
      }
      setSelected([])
      toast.success(`${ids.length} lead(s) deleted`)
    } catch (err) {
      toast.error(err?.message || 'Failed to delete lead(s)')
    }
  }

  const handleExport = () => {
    if (!canExport) {
      toast.error('You do not have permission to export leads.')
      return
    }
    const cols = ['name','email','phone','company','service','specialization','source','score','status','value','assignedTo','createdAt']
    const rows = [cols.join(','), ...leads.map(l => cols.map(c => `"${l[c] ?? ''}"`).join(','))]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'leads.csv'; a.click()
    toast.success('Leads exported to CSV.')
  }

  const handleImport = async (e) => {
    if (!canImport) {
      toast.error('You do not have permission to import leads.')
      e.target.value = ''
      return
    }
    const file = e.target.files?.[0]; if (!file) return
    try {
      await leadsAPI.import(file)
      await fetchLeads()
      toast.success('Leads imported.')
    } catch (err) {
      toast.error(err?.message || 'Failed to import leads')
    }
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 mt-0.5">{leads.length} leads total · {leads.filter((l) => l.score === 'hot').length} hot</p>
        </div>
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2">
          {selected.length > 0 && canDelete && (
            <button onClick={() => handleDelete(selected)} className="btn-danger text-xs gap-1.5">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.length})
            </button>
          )}
          {canImport && (
            <>
              <input ref={importRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
              <button onClick={() => importRef.current?.click()} className="btn-secondary text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Import
              </button>
            </>
          )}
          {canExport && (
            <button onClick={handleExport} className="btn-secondary text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          )}
          {canCreate && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 rounded-xl px-3 py-2 w-full sm:flex-1 sm:min-w-[12rem]">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company…"
            className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none flex-1"
          />
        </div>
        <select
          value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)}
          className="input w-full sm:w-auto text-xs"
        >
          <option value="all">All Scores</option>
          <option value="hot">🔥 Hot</option>
          <option value="warm">🌡️ Warm</option>
          <option value="cold">❄️ Cold</option>
        </select>
        <select
          value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-full sm:w-auto text-xs"
        >
          <option value="all">All Status</option>
          {['new','contacted','qualified','proposal','negotiation','won','lost'].map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card py-12 text-center text-slate-400">
            <p className="text-lg">No leads found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
          </div>
        ) : (
          filtered.map((lead) => {
            const scoreCfg = SCORE_BADGE[lead.score]
            const statusCfg = STATUS_BADGE[lead.status] ?? { label: lead.status, cls: 'badge' }
            const ScoreIcon = scoreCfg?.icon
            const aging = getLeadAgingMeta(lead, timeTick)
            const ageMin = getLeadAgeMinutes(lead, timeTick)
            return (
              <div key={lead.id} className="glass-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.email}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.phone || 'No mobile'}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{lead.company}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selected.includes(lead.id)}
                    onChange={() => toggleSelect(lead.id)}
                    className="mt-1 rounded border-slate-300 text-brand-600"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={scoreCfg?.cls}>
                    {ScoreIcon && <ScoreIcon className="w-3 h-3" />} {scoreCfg?.label}
                  </span>
                  <span className={statusCfg.cls}>{statusCfg.label}</span>
                  <span className={`badge ${aging.badge}`}>{aging.label}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><span className="text-slate-400">Source:</span> {lead.source}</p>
                  <p><span className="text-slate-400">Value:</span> ₹{(lead.value / 1000).toFixed(0)}k</p>
                  <p><span className="text-slate-400">Service:</span> {lead.service || '—'}</p>
                  <p><span className="text-slate-400">Specialization:</span> {lead.specialization || '—'}</p>
                  <p><span className="text-slate-400">Owner:</span> {lead.assignedTo || 'Unassigned'}</p>
                  <p><span className="text-slate-400">Date:</span> {lead.createdAt}</p>
                </div>

                <p className="text-[11px] text-slate-400">
                  {ageMin === null ? 'No activity timer' : `${ageMin} min since last activity`}
                </p>

                <div className="flex flex-wrap items-center gap-1">
                  {canUpdate && (
                    <button onClick={() => setEditLead(lead)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600 transition-colors"
                      title="Edit lead">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => setHistoryLead(lead)}
                    className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/20 text-slate-400 hover:text-violet-500 transition-colors"
                    title="View history">
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setActivitiesLead(lead)}
                    className="p-1.5 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-400 hover:text-brand-600 transition-colors"
                    title="Lead Activities">
                    <ClipboardList className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setWaLead(lead)}
                    className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/20 text-slate-400 hover:text-green-600 transition-colors"
                    title="Send WhatsApp">
                    <MessageCircle className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDetailLead(lead)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                    title="View details">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  {canDelete && (
                    <button onClick={() => handleDelete([lead.id])}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500"
                      title="Delete lead">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Table */}
      <div className="hidden sm:block glass-card overflow-hidden">
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-slate-200/70 dark:border-slate-700/40 bg-white/50 dark:bg-slate-900/20">
                <th className="py-3 px-4 text-left w-10">
                  <input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll}
                    className="rounded border-slate-300 text-brand-600" />
                </th>
                {[
                  { key: 'name',      label: 'Name' },
                  { key: 'company',   label: 'Company' },
                  { key: 'service',   label: 'Service' },
                  { key: 'score',     label: 'AI Score' },
                  { key: 'status',    label: 'Status' },
                  { key: 'aging',     label: 'Aging' },
                  { key: 'createdAt', label: 'Date' },
                ].map(({ key, label }) => (
                  <th key={key} className="py-2.5 px-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200"
                    onClick={() => handleSort(key)}>
                    <span className="flex items-center gap-1">{label} <SortIcon field={key} /></span>
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/30">
              <AnimatePresence>
                {filtered.map((lead) => {
                  const scoreCfg = SCORE_BADGE[lead.score]
                  const statusCfg = STATUS_BADGE[lead.status] ?? { label: lead.status, cls: 'badge' }
                  const ScoreIcon = scoreCfg?.icon
                  const aging = getLeadAgingMeta(lead, timeTick)
                  const ageMin = getLeadAgeMinutes(lead, timeTick)
                  const isExpandedRow = expandedLeadId === lead.id
                  return (
                    <Fragment key={lead.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/25 transition-colors
                          ${selected.includes(lead.id) ? 'bg-brand-50/40 dark:bg-brand-950/10' : ''}`}
                      >
                        <td className="py-2.5 px-3 align-top">
                          <input type="checkbox" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)}
                            className="rounded border-slate-300 text-brand-600" />
                        </td>
                        <td className="py-2.5 px-3 cursor-pointer align-top" onClick={() => toggleExpandedLead(lead.id)}>
                          <div className="max-w-[280px]">
                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">{lead.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">{lead.email || 'N/A'}</p>
                            <p className={`text-[11px] truncate ${lead.phone ? 'text-slate-500' : 'text-slate-400 italic'}`}>
                              {lead.phone || 'No mobile'}
                            </p>
                            {isExpandedRow && (
                              <div className="mt-1.5 pt-1.5 border-t border-slate-200/70 dark:border-slate-700/50 space-y-0.5 text-[11px] leading-tight">
                                <p className="text-slate-500 dark:text-slate-400">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Spec:</span>{' '}
                                  {lead.specialization ? lead.specialization : <span className="text-slate-400 italic">—</span>}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Source:</span> {lead.source || '—'}
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Value:</span> ₹{(lead.value / 1000).toFixed(0)}k
                                </p>
                                <p className="text-slate-500 dark:text-slate-400">
                                  <span className="font-medium text-slate-600 dark:text-slate-300">Owner:</span> {lead.assignedTo || 'Unassigned'}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[160px] cursor-pointer align-top" onClick={() => toggleExpandedLead(lead.id)}>
                          <p className="truncate">
                            {lead.company
                              ? <span className="text-slate-600 dark:text-slate-400">{lead.company}</span>
                              : <span className="text-slate-400 italic">—</span>}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 max-w-[160px] cursor-pointer align-top" onClick={() => toggleExpandedLead(lead.id)}>
                          <p className="truncate">
                            {lead.service
                              ? <span className="text-slate-600 dark:text-slate-400">{lead.service}</span>
                              : <span className="text-slate-400 italic">—</span>}
                          </p>
                        </td>
                        <td className="py-2.5 px-3 cursor-pointer align-top" onClick={() => toggleExpandedLead(lead.id)}>
                          <span className={scoreCfg?.cls}>
                            {ScoreIcon && <ScoreIcon className="w-3 h-3" />} {scoreCfg?.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 cursor-pointer align-top" onClick={() => toggleExpandedLead(lead.id)}>
                          <span className={statusCfg.cls}>{statusCfg.label}</span>
                        </td>
                        <td className="py-2.5 px-3 align-top cursor-pointer" onClick={() => toggleExpandedLead(lead.id)}>
                          <div className="flex flex-col justify-center gap-0.5 leading-tight">
                            <span className={`badge ${aging.badge}`}>{aging.label}</span>
                            <span className="text-[10px] text-slate-400">
                              {ageMin === null ? 'No timer' : `${ageMin} min since activity`}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-xs max-w-[140px] cursor-pointer truncate align-top" onClick={() => toggleExpandedLead(lead.id)}>{lead.createdAt}</td>
                        <td className="py-2.5 px-3 align-top">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <button onClick={() => setEditLead(lead)}
                                className="p-1 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                title="Edit lead">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button onClick={() => setHistoryLead(lead)}
                              className="p-1 rounded-md border border-transparent hover:border-violet-200 dark:hover:border-violet-900 hover:bg-violet-50 dark:hover:bg-violet-950/20 text-slate-400 hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                              title="View history">
                              <History className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setActivitiesLead(lead)}
                              className="p-1 rounded-md border border-transparent hover:border-brand-200 dark:hover:border-brand-900 hover:bg-brand-50 dark:hover:bg-brand-950/20 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                              title="Lead Activities">
                              <ClipboardList className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setWaLead(lead)}
                              className="p-1 rounded-md border border-transparent hover:border-green-200 dark:hover:border-green-900 hover:bg-green-50 dark:hover:bg-green-950/20 text-slate-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                              title="Send WhatsApp">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDetailLead(lead)}
                              className="p-1 rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                              title="View details">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                            {canDelete && (
                              <button onClick={() => handleDelete([lead.id])}
                                className="p-1 rounded-md border border-transparent hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500"
                                title="Delete lead">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    </Fragment>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <p className="text-lg">No leads found</p>
              <p className="text-sm mt-1">Try adjusting your filters or add a new lead</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-200/60 dark:border-slate-700/40">
          <p className="text-xs text-slate-500">Showing {filtered.length} of {leads.length} leads</p>
          <div className="flex gap-1">
            {[1,2,3,'...'].map((p, i) => (
              <button key={i} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors
                ${p === 1 ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}
              >{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      <AnimatePresence>
        {showAddModal && <AddLeadModal onClose={() => setShowAddModal(false)} onAdd={handleAdd} />}
      </AnimatePresence>

      {/* Edit Lead Modal */}
      <AnimatePresence>
        {editLead && <EditLeadModal lead={editLead} onClose={() => setEditLead(null)} onSave={handleSave} />}
      </AnimatePresence>

      {/* Lead Detail Modal */}
      <AnimatePresence>
        {detailLead && (
          <LeadDetailModal
            lead={detailLead}
            onClose={() => setDetailLead(null)}
            onEdit={(l) => setEditLead(l)}
            onDelete={handleDelete}
            canEdit={canUpdate}
            canDelete={canDelete}
          />
        )}
      </AnimatePresence>

      {/* Lead History Drawer */}
      <AnimatePresence>
        {historyLead && <LeadHistoryPanel lead={historyLead} onClose={() => setHistoryLead(null)} />}
      </AnimatePresence>

      {/* Lead Activities Modal */}
      <AnimatePresence>
        {activitiesLead && <LeadActivitiesModal lead={activitiesLead} onClose={() => setActivitiesLead(null)} />}
      </AnimatePresence>

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {waLead && <WhatsAppModal lead={waLead} onClose={() => setWaLead(null)} />}
      </AnimatePresence>
    </div>
  )
}
