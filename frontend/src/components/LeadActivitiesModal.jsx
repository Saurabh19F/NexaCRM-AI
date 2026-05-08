import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Clock, Phone, Users, Trophy, ChevronRight, Save, AlertCircle } from 'lucide-react'

const TEAM_MEMBERS = ['Priya S.', 'Rahul M.', 'Amit K.', 'Neha T.', 'Vikram D.', 'Sonia P.']

/* ── Activity definitions matching your Excel workflow ── */
const ACTIVITIES = [
  {
    id: 'act01',
    label: 'Activity 01',
    title: 'Welcome Call',
    description: 'Call With Client and Fix meeting if interested',
    hours: 1,
    icon: Phone,
    color: { bg: '#fff0f0', border: '#fca5a5', header: '#ef4444', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', step: 'bg-red-500' },
    fields: [
      { key: 'type',               label: 'Type',                        type: 'select', options: ['Inbound','Outbound','Referral','Walk-in'] },
      { key: 'source',             label: 'Source',                      type: 'select', options: ['Facebook','Instagram','LinkedIn','Website','WhatsApp','Cold Call','Other'] },
      { key: 'date',               label: 'Date',                        type: 'date' },
      { key: 'serviceRequirement', label: 'Which Type of Service Requirement', type: 'text' },
      { key: 'whatsappMessage',    label: 'WhatsApp Message',            type: 'textarea' },
      { key: 'plannedDate',        label: 'Planned / Click Date for Link', type: 'datetime-local' },
      { key: 'actual',             label: 'Actual Date',                 type: 'datetime-local' },
      { key: 'delay',              label: 'Delay (hrs)',                 type: 'number' },
      { key: 'status',             label: 'Status',                      type: 'select', options: ['Pending','In Progress','Done','Not Interested','No Answer','Callback'] },
      { key: 'remark',             label: 'Remark if any',               type: 'textarea' },
      { key: 'actualDateStatus',   label: 'Actual Date Status',          type: 'select', options: ['On Time','Delayed','Early','Missed'] },
    ],
  },
  {
    id: 'act02',
    label: 'Activity 02',
    title: 'Follow Up for Meeting',
    description: 'Follow up Client for meeting and fill Follow up forms',
    hours: 2,
    icon: Clock,
    color: { bg: '#eff6ff', border: '#93c5fd', header: '#3b82f6', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', step: 'bg-blue-500' },
    fields: [
      { key: 'plannedDate',         label: 'Planned / Click Date for Link', type: 'datetime-local' },
      { key: 'actual',              label: 'Actual Date',                   type: 'datetime-local' },
      { key: 'delay',               label: 'Delay (hrs)',                   type: 'number' },
      { key: 'status',              label: 'Status',                        type: 'select', options: ['Pending','Called','Meeting Fixed','Not Interested','Rescheduled'] },
      { key: 'nextFollowUpDate',    label: 'Next Follow-Up Date',           type: 'date' },
      { key: 'packagePriceEstimate',label: 'Package Price Estimate (₹)',    type: 'number' },
      { key: 'remarkFollowUp',      label: 'Remark of Follow-Up',           type: 'textarea' },
      { key: 'remarkNotInterested', label: 'Remark of Not Interested',      type: 'textarea' },
      { key: 'actualDateStatus',    label: 'Actual Date Status',            type: 'select', options: ['On Time','Delayed','Early','Missed'] },
    ],
  },
  {
    id: 'act03',
    label: 'Activity 03',
    title: 'Allowed Person for Meeting',
    description: 'Fill Details for Meeting person and share details',
    hours: null,
    icon: Users,
    color: { bg: '#f5f3ff', border: '#c4b5fd', header: '#7c3aed', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300', step: 'bg-violet-500' },
    fields: [
      { key: 'plannedDate',      label: 'Planned / Click Date for Link', type: 'datetime-local' },
      { key: 'actual',           label: 'Actual Date',                   type: 'datetime-local' },
      { key: 'delay',            label: 'Delay (hrs)',                   type: 'number' },
      { key: 'personName',       label: 'Person Name',                   type: 'text' },
      { key: 'personDesignation',label: 'Designation',                   type: 'text' },
      { key: 'meetingDate',      label: 'Meeting Date',                  type: 'datetime-local' },
      { key: 'meetingMode',      label: 'Meeting Mode',                  type: 'select', options: ['In-Person','Video Call','Phone Call'] },
      { key: 'remark',           label: 'Remark',                        type: 'textarea' },
      { key: 'actualDateStatus', label: 'Actual Date Status',            type: 'select', options: ['On Time','Delayed','Early','Missed'] },
    ],
  },
  {
    id: 'act04',
    label: 'Activity 04',
    title: 'Meeting Outcome',
    description: 'Fill Meeting Outcome and Requirement Details',
    hours: null,
    icon: Trophy,
    color: { bg: '#f0fdf4', border: '#86efac', header: '#16a34a', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', step: 'bg-green-500' },
    fields: [
      { key: 'plannedDate',      label: 'Planned / Click Date for Link', type: 'datetime-local' },
      { key: 'actual',           label: 'Actual Date',                   type: 'datetime-local' },
      { key: 'delay',            label: 'Delay (hrs)',                   type: 'number' },
      { key: 'status',           label: 'Status',                        type: 'select', options: ['Won','Lost','Follow-Up Required','Pending Decision','No Response'] },
      { key: 'followUpDate',     label: 'Follow-Up Date',                type: 'date' },
      { key: 'meetingPriceFinal',label: 'Meeting Price Final (₹)',        type: 'number' },
      { key: 'remarkFollowUp',   label: 'Remark of Follow-Up',           type: 'textarea' },
      { key: 'remarkWon',        label: 'Remark of Won',                 type: 'textarea' },
      { key: 'lostCategory',     label: 'Lost Category',                 type: 'select', options: ['Price','Competition','No Need','Timing','Budget','Other'] },
      { key: 'remarkLost',       label: 'Remark of Lost',                type: 'textarea' },
      { key: 'actualDateStatus', label: 'Actual Date Status',            type: 'select', options: ['On Time','Delayed','Early','Missed'] },
      { key: 'calendarStatus',   label: 'Calendar Status',               type: 'select', options: ['Scheduled','Completed','Cancelled','Rescheduled'] },
    ],
  },
]

function FieldInput({ field, value, onChange }) {
  const base = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition'
  if (field.type === 'textarea')
    return <textarea rows={2} value={value||''} onChange={e=>onChange(e.target.value)} className={base + ' resize-none'} />
  if (field.type === 'select')
    return (
      <select value={value||''} onChange={e=>onChange(e.target.value)} className={base}>
        <option value=''>— select —</option>
        {field.options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    )
  return <input type={field.type} value={value||''} onChange={e=>onChange(e.target.value)} className={base} />
}

export default function LeadActivitiesModal({ lead, onClose }) {
  const [activeTab, setActiveTab] = useState(0)
  const [saved, setSaved] = useState([false, false, false, false])
  const [data, setData] = useState([{},{},{},{}])

  const act = ACTIVITIES[activeTab]
  const Icon = act.icon

  const updateField = (key, val) => {
    setData(prev => {
      const next = [...prev]
      next[activeTab] = { ...next[activeTab], [key]: val }
      return next
    })
  }

  const handleSave = () => {
    setSaved(prev => { const n=[...prev]; n[activeTab]=true; return n })
  }

  const isComplete = (idx) => saved[idx]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity:0, scale:0.95, y:20 }}
        animate={{ opacity:1, scale:1, y:0 }}
        exit={{ opacity:0, scale:0.95, y:20 }}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Lead Activities</h2>
            <p className="text-xs text-slate-500 mt-0.5">{lead?.name} · {lead?.company}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-0 overflow-x-auto custom-scrollbar pb-1">
            {ACTIVITIES.map((a, i) => {
              const AIcon = a.icon
              const done = isComplete(i)
              const active = i === activeTab
              return (
                <div key={a.id} className="flex items-center min-w-[140px] sm:min-w-0 flex-1">
                  <button
                    onClick={() => setActiveTab(i)}
                    className={`flex flex-col items-center gap-1 flex-1 px-2 py-2 rounded-xl transition-all ${active ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm transition-all ${done ? 'bg-emerald-500' : active ? a.color.step : 'bg-slate-300 dark:bg-slate-600'}`}>
                      {done ? <CheckCircle2 className="w-5 h-5" /> : <AIcon className="w-4 h-4" />}
                    </div>
                    <span className={`text-xs font-medium ${active ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{a.label}</span>
                    <span className={`text-xs hidden sm:block text-center leading-tight ${active ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}`}>{a.title}</span>
                  </button>
                  {i < ACTIVITIES.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity:0, x:20 }}
              animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:-20 }}
              transition={{ duration:0.18 }}
            >
              {/* Activity Excel-style Header */}
              <div className="mx-4 sm:mx-6 mt-5 rounded-xl overflow-hidden border" style={{ borderColor: act.color.border }}>
                <div className="px-4 py-2 text-white text-sm font-bold flex items-center justify-between" style={{ background: act.color.header }}>
                  <span>{act.label} — {act.title}</span>
                  {act.hours && <span className="text-xs font-normal opacity-80">{act.hours} Hour{act.hours>1?'s':''}</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x text-xs" style={{ background: act.color.bg, borderColor: act.color.border }}>
                  <div className="px-3 py-1.5">
                    <span className="text-slate-500">What has to be done</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{act.title}</p>
                  </div>
                  <div className="px-3 py-1.5">
                    <span className="text-slate-500">Who will do it</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{data[activeTab].assignedTo || <span className="text-slate-400 font-normal">Not assigned</span>}</p>
                  </div>
                  <div className="px-3 py-1.5">
                    <span className="text-slate-500">How will it be done</span>
                    <p className="font-semibold text-slate-700 mt-0.5">{act.description}</p>
                  </div>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="px-4 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {act.fields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{field.label}</label>
                    <FieldInput field={field} value={data[activeTab][field.key]} onChange={val => updateField(field.key, val)} />
                  </div>
                ))}

                {/* Assigned To — team member dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Assign To Team Member <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={data[activeTab].assignedTo || ''}
                    onChange={e => updateField('assignedTo', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition"
                  >
                    <option value="">— Select team member —</option>
                    {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Saved banner */}
              {saved[activeTab] && (
                <div className="mx-4 sm:mx-6 mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Activity saved successfully!
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {activeTab > 0 && (
              <button onClick={() => setActiveTab(t => t - 1)} className="btn-secondary text-xs">← Prev</button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn-primary text-xs gap-1.5">
              <Save className="w-3.5 h-3.5" /> Save Activity
            </button>
            {activeTab < ACTIVITIES.length - 1 && (
              <button onClick={() => { handleSave(); setActiveTab(t => t + 1) }} className="btn-secondary text-xs">
                Next Activity →
              </button>
            )}
            {activeTab === ACTIVITIES.length - 1 && (
              <button onClick={() => { handleSave(); onClose() }} className="btn-primary text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" /> Complete All
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
