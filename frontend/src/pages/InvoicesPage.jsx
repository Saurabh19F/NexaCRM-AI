import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Receipt, Plus, Download, Eye, Send, CheckCircle, Clock, AlertCircle, IndianRupee, X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const MOCK_INVOICES = [
  { id: 'INV-1042', customer: 'Bajaj Finserv', amount: 480000, gst: 86400, total: 566400, status: 'paid',    date: '2026-04-18', due: '2026-05-02', items: [{ desc: 'CRM License (Annual)', qty: 1, rate: 200000, amount: 200000 }, { desc: 'Implementation & Setup', qty: 1, rate: 150000, amount: 150000 }, { desc: 'Training & Support', qty: 1, rate: 130000, amount: 130000 }] },
  { id: 'INV-1041', customer: 'HCL Tech',      amount: 580000, gst: 104400, total: 684400, status: 'pending', date: '2026-04-22', due: '2026-05-06', items: [{ desc: 'Enterprise CRM Suite', qty: 1, rate: 300000, amount: 300000 }, { desc: 'AI Engine Add-on', qty: 1, rate: 120000, amount: 120000 }, { desc: 'API Integration', qty: 2, rate: 60000, amount: 120000 }, { desc: 'Dedicated Support', qty: 1, rate: 40000, amount: 40000 }] },
  { id: 'INV-1040', customer: 'Wipro',          amount: 420000, gst: 75600,  total: 495600, status: 'pending', date: '2026-04-20', due: '2026-05-04', items: [{ desc: 'CRM License (6 months)', qty: 1, rate: 250000, amount: 250000 }, { desc: 'Custom Dashboard', qty: 1, rate: 80000, amount: 80000 }, { desc: 'Data Migration', qty: 1, rate: 50000, amount: 50000 }, { desc: 'Onboarding', qty: 1, rate: 40000, amount: 40000 }] },
  { id: 'INV-1039', customer: 'InfoSys Ltd.',   amount: 250000, gst: 45000,  total: 295000, status: 'overdue', date: '2026-04-05', due: '2026-04-19', items: [{ desc: 'CRM License (Quarterly)', qty: 1, rate: 180000, amount: 180000 }, { desc: 'Support Package', qty: 1, rate: 70000, amount: 70000 }] },
  { id: 'INV-1038', customer: 'Mindtree',       amount: 320000, gst: 57600,  total: 377600, status: 'paid',    date: '2026-04-10', due: '2026-04-24', items: [{ desc: 'NexaCRM Starter', qty: 1, rate: 150000, amount: 150000 }, { desc: 'WhatsApp Integration', qty: 1, rate: 90000, amount: 90000 }, { desc: 'Analytics Module', qty: 1, rate: 80000, amount: 80000 }] },
  { id: 'INV-1037', customer: 'GlobalSoft',     amount: 85000,  gst: 15300,  total: 100300, status: 'draft',   date: '2026-04-28', due: '2026-05-12', items: [{ desc: 'Basic CRM License', qty: 1, rate: 85000, amount: 85000 }] },
]

const STATUS_CONFIG = {
  paid:    { label: 'Paid',    cls: 'badge-won',  icon: CheckCircle, iconColor: 'text-emerald-500' },
  pending: { label: 'Pending', cls: 'badge-warm', icon: Clock,       iconColor: 'text-amber-500' },
  overdue: { label: 'Overdue', cls: 'badge-lost', icon: AlertCircle, iconColor: 'text-red-500' },
  draft:   { label: 'Draft',   cls: 'badge-new',  icon: Receipt,     iconColor: 'text-brand-500' },
}

const EMPTY_FORM = { customer: '', status: 'draft', date: '', due: '', items: [{ desc: '', qty: 1, rate: '' }] }

function calcTotals(items) {
  const amount = items.reduce((s, it) => s + (Number(it.qty) * Number(it.rate) || 0), 0)
  const gst = Math.round(amount * 0.18)
  return { amount, gst, total: amount + gst }
}

function downloadInvoice(inv) {
  const lines = [
    '===================================================',
    `               NexaCRM AI — INVOICE`,
    '===================================================',
    `Invoice #: ${inv.id}`,
    `Customer:  ${inv.customer}`,
    `Date:      ${inv.date}`,
    `Due Date:  ${inv.due}`,
    `Status:    ${STATUS_CONFIG[inv.status]?.label ?? inv.status}`,
    '---------------------------------------------------',
    'ITEMS:',
    ...(inv.items ?? []).map((it, i) => `  ${i + 1}. ${it.desc}  (${it.qty} × ₹${Number(it.rate).toLocaleString()}) = ₹${Number(it.amount).toLocaleString()}`),
    '---------------------------------------------------',
    `Subtotal:  ₹${inv.amount.toLocaleString()}`,
    `GST (18%): ₹${inv.gst.toLocaleString()}`,
    `TOTAL:     ₹${inv.total.toLocaleString()}`,
    '===================================================',
    'Thank you for your business!',
    'NexaCRM AI · support@nexacrm.ai · +91-22-4000-0000',
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${inv.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`${inv.id} downloaded`)
}

/* ── New Invoice Modal ──────────────────────────────────────────── */
function NewInvoiceModal({ onClose, onSave }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10), due: '' })
  const [errors, setErrors] = useState({})

  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const setItem = (i, k, v) => {
    const items = form.items.map((it, idx) => {
      if (idx !== i) return it
      const updated = { ...it, [k]: v }
      updated.amount = (Number(updated.qty) * Number(updated.rate)) || 0
      return updated
    })
    setForm((p) => ({ ...p, items }))
  }
  const addItem = () => setForm((p) => ({ ...p, items: [...p.items, { desc: '', qty: 1, rate: '' }] }))
  const removeItem = (i) => setForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))

  const validate = () => {
    const e = {}
    if (!form.customer.trim()) e.customer = 'Required'
    if (!form.due) e.due = 'Required'
    if (form.items.some((it) => !it.desc.trim() || !it.rate)) e.items = 'Fill all item fields'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const { amount, gst, total } = calcTotals(form.items)
    const newInv = {
      id: `INV-${1043 + Math.floor(Math.random() * 100)}`,
      customer: form.customer.trim(),
      amount, gst, total,
      status: form.status,
      date: form.date,
      due: form.due,
      items: form.items.map((it) => ({ ...it, rate: Number(it.rate), amount: Number(it.qty) * Number(it.rate) })),
    }
    onSave(newInv)
    toast.success(`Invoice ${newInv.id} created`)
    onClose()
  }

  const { amount, gst, total } = calcTotals(form.items)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-sky-500" /> New Invoice
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer *</label>
            <input value={form.customer} onChange={(e) => setField('customer', e.target.value)}
              placeholder="Company or contact name"
              className={`input mt-1 w-full ${errors.customer ? 'ring-2 ring-red-400' : ''}`} />
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Invoice Date</label>
            <input type="date" value={form.date} onChange={(e) => setField('date', e.target.value)} className="input mt-1 w-full" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Due Date *</label>
            <input type="date" value={form.due} onChange={(e) => setField('due', e.target.value)}
              className={`input mt-1 w-full ${errors.due ? 'ring-2 ring-red-400' : ''}`} />
            {errors.due && <p className="text-xs text-red-500 mt-1">{errors.due}</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
            <select value={form.status} onChange={(e) => setField('status', e.target.value)} className="input mt-1 w-full">
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Line Items *</label>
            <button onClick={addItem} className="text-xs text-brand-600 dark:text-brand-400 font-semibold flex items-center gap-1 hover:underline">
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>
          {errors.items && <p className="text-xs text-red-500 mb-2">{errors.items}</p>}
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={it.desc} onChange={(e) => setItem(i, 'desc', e.target.value)}
                  placeholder="Description" className="input col-span-5 text-xs" />
                <input type="number" min={1} value={it.qty} onChange={(e) => setItem(i, 'qty', e.target.value)}
                  placeholder="Qty" className="input col-span-2 text-xs" />
                <input type="number" min={0} value={it.rate} onChange={(e) => setItem(i, 'rate', e.target.value)}
                  placeholder="Rate ₹" className="input col-span-3 text-xs" />
                <span className="col-span-1 text-xs text-slate-500 text-right">
                  ₹{((Number(it.qty) * Number(it.rate)) / 1000 || 0).toFixed(0)}k
                </span>
                {form.items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="col-span-1 p-1 text-red-400 hover:text-red-600">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span><span>₹{amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>GST (18%)</span><span>₹{gst.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 text-base border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1">
            <span>Total</span><span>₹{total.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1 text-sm">Create Invoice</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── View Invoice Modal ─────────────────────────────────────────── */
function ViewInvoiceModal({ inv, onClose }) {
  const config = STATUS_CONFIG[inv.status]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-lg p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 font-mono">{inv.id}</h2>
            <p className="text-sm text-slate-500">{inv.customer}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`${config?.cls} flex items-center gap-1`}>
              {config?.icon && <config.icon className="w-3 h-3" />} {config?.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {[['Invoice Date', inv.date], ['Due Date', inv.due]].map(([l, v]) => (
            <div key={l} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
              <p className="text-slate-400 mb-0.5">{l}</p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">{v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Line Items</p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="grid grid-cols-12 gap-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              <span className="col-span-6">Description</span>
              <span className="col-span-2 text-right">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {(inv.items ?? []).map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 py-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="col-span-6">{it.desc}</span>
                <span className="col-span-2 text-right">{it.qty}</span>
                <span className="col-span-2 text-right">₹{Number(it.rate).toLocaleString()}</span>
                <span className="col-span-2 text-right">₹{Number(it.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Subtotal</span><span>₹{inv.amount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>GST (18%)</span><span>₹{inv.gst.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 text-base border-t border-slate-200 dark:border-slate-700 pt-1.5 mt-1">
            <span>Total</span><span>₹{inv.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { downloadInvoice(inv); onClose() }} className="btn-secondary flex-1 text-sm gap-1.5">
            <Download className="w-4 h-4" /> Download
          </button>
          <button onClick={onClose} className="btn-primary flex-1 text-sm">Close</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Send Reminder Modal ────────────────────────────────────────── */
function ReminderModal({ inv, onClose }) {
  const send = () => {
    toast.success(`Payment reminder sent to ${inv.customer}`)
    onClose()
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }}
        className="glass-card w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Send Payment Reminder</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-300">
          <p className="font-semibold">{inv.id} — {inv.customer}</p>
          <p className="mt-1 text-amber-700 dark:text-amber-400">
            Amount due: ₹{inv.total.toLocaleString()} · Due {inv.due}
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          A payment reminder email and WhatsApp message will be sent to <span className="font-semibold">{inv.customer}</span>.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
          <button onClick={send} className="btn-primary flex-1 text-sm gap-1.5">
            <Send className="w-4 h-4" /> Send Reminder
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState(MOCK_INVOICES)
  const [showNew, setShowNew] = useState(false)
  const [viewInv, setViewInv] = useState(null)
  const [reminderInv, setReminderInv] = useState(null)

  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const totalPending = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + i.total, 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-sky-500" /> Invoices & Payments
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{invoices.length} invoices · GST enabled</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Revenue Collected', value: totalRevenue, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
          { label: 'Pending',           value: totalPending, icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/20' },
          { label: 'Overdue',           value: totalOverdue, icon: AlertCircle, color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-950/20' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="glass-card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-0.5">
                <IndianRupee className="w-4 h-4" />{(value / 100000).toFixed(1)}L
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Invoice Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30">
                {['Invoice #','Customer','Date','Due Date','Amount','GST (18%)','Total','Status','Actions'].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/40">
              {invoices.map((inv) => {
                const config = STATUS_CONFIG[inv.status]
                const Icon = config?.icon
                return (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-brand-600 dark:text-brand-400">{inv.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">{inv.customer}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{inv.date}</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{inv.due}</td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">₹{(inv.amount/1000).toFixed(0)}k</td>
                    <td className="py-3 px-4 text-slate-500">₹{(inv.gst/1000).toFixed(1)}k</td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">₹{(inv.total/1000).toFixed(0)}k</td>
                    <td className="py-3 px-4">
                      <span className={`${config?.cls} flex items-center gap-1 w-fit`}>
                        {Icon && <Icon className="w-3 h-3" />} {config?.label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button onClick={() => setViewInv(inv)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500"
                          title="View invoice">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => downloadInvoice(inv)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                          title="Download invoice">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {inv.status !== 'paid' && (
                          <button onClick={() => setReminderInv(inv)}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-500"
                            title="Send payment reminder">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showNew && <NewInvoiceModal onClose={() => setShowNew(false)} onSave={(inv) => setInvoices((p) => [inv, ...p])} />}
        {viewInv && <ViewInvoiceModal inv={viewInv} onClose={() => setViewInv(null)} />}
        {reminderInv && <ReminderModal inv={reminderInv} onClose={() => setReminderInv(null)} />}
      </AnimatePresence>
    </div>
  )
}
