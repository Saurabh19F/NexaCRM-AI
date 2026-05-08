import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Plus, Play, Pause, Trash2, ChevronRight, CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_COLORS = {
  'Lead Management': 'bg-brand-100 text-brand-700 dark:bg-brand-950/40 dark:text-brand-400',
  Sales: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  Invoices: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  Finance: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  AI: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  Communication: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  Operations: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

const STEP_TYPES = ['IF', 'THEN', 'WAIT', 'CONDITION']

const STEP_COLORS = {
  IF: 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400',
  THEN: 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400',
  WAIT: 'bg-violet-50 dark:bg-violet-950/20 text-violet-700 dark:text-violet-400',
  CONDITION: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400',
}

const ADVANCED_TEMPLATES = [
  {
    id: 'sla-breach',
    name: 'Lead SLA Breach Automation',
    category: 'Lead Management',
    priority: 'critical',
    steps: [
      { type: 'IF', text: 'Lead not contacted in 1 hour' },
      { type: 'THEN', text: 'Mark SLA breached' },
      { type: 'THEN', text: 'Notify admin' },
      { type: 'THEN', text: 'Reassign lead using smart logic' },
    ],
  },
  {
    id: 'smart-reassign',
    name: 'Smart Reassignment Logic',
    category: 'Operations',
    steps: [
      { type: 'IF', text: 'Lead requires assignment or reassignment' },
      { type: 'THEN', text: 'Rank reps by least busy load' },
      { type: 'THEN', text: 'Boost score by performer rank + online status + skill match' },
      { type: 'THEN', text: 'Assign lead to highest score rep' },
    ],
  },
  {
    id: 'ai-scoring',
    name: 'AI Lead Scoring Automation',
    category: 'AI',
    steps: [
      { type: 'IF', text: 'Lead created' },
      { type: 'THEN', text: 'Analyze source, budget, and activity signals' },
      { type: 'THEN', text: 'Assign score: Hot / Warm / Cold' },
      { type: 'CONDITION', text: 'If Hot => move to priority queue; if Cold => start nurture flow' },
    ],
  },
  {
    id: 'hot-call-scheduler',
    name: 'Auto Call / Meeting Scheduler',
    category: 'Sales',
    steps: [
      { type: 'IF', text: 'Lead marked Hot' },
      { type: 'THEN', text: 'Auto-schedule call based on rep availability' },
      { type: 'THEN', text: 'Send calendar invite (Google Calendar)' },
      { type: 'THEN', text: 'Generate Zoom / Meet link and attach to lead timeline' },
    ],
  },
  {
    id: 'whatsapp-conversation',
    name: 'WhatsApp Conversation Automation',
    category: 'Communication',
    steps: [
      { type: 'IF', text: 'Lead created' },
      { type: 'THEN', text: 'Send welcome WhatsApp message' },
      { type: 'WAIT', text: '30 minutes' },
      { type: 'CONDITION', text: 'If reply received => move to Active Lead; else send follow-up message' },
    ],
  },
  {
    id: 'multi-step-chain',
    name: 'Multi-Step Follow-up Chain',
    category: 'Lead Management',
    steps: [
      { type: 'IF', text: 'Lead created' },
      { type: 'THEN', text: 'Assign representative' },
      { type: 'WAIT', text: '1 hour' },
      { type: 'CONDITION', text: 'If no response => send reminder' },
      { type: 'WAIT', text: '30 minutes' },
      { type: 'CONDITION', text: 'If still no response => reassign lead' },
    ],
  },
  {
    id: 'behavior-based',
    name: 'Behavior-Based Interest Automation',
    category: 'AI',
    steps: [
      { type: 'IF', text: 'Customer opens the same email 3 times' },
      { type: 'THEN', text: 'Mark lead as interested' },
      { type: 'THEN', text: 'Notify assigned sales rep instantly' },
    ],
  },
  {
    id: 'revenue-automation',
    name: 'Revenue Automation Flow',
    category: 'Invoices',
    steps: [
      { type: 'IF', text: 'Deal moved to Won' },
      { type: 'THEN', text: 'Generate invoice' },
      { type: 'THEN', text: 'Send payment link' },
      { type: 'THEN', text: 'Start payment tracking and reminders' },
    ],
  },
  {
    id: 'risk-detection',
    name: 'Sales Rep Risk Detection',
    category: 'Operations',
    steps: [
      { type: 'IF', text: 'Employee ignores 5 leads in a day' },
      { type: 'THEN', text: 'Alert admin with rep summary' },
      { type: 'THEN', text: 'Reduce new lead assignment for that rep' },
    ],
  },
  {
    id: 'custom-rule-builder',
    name: 'Custom Rule Builder Template',
    category: 'Lead Management',
    steps: [
      { type: 'IF', text: 'Source = Instagram AND budget > 50k' },
      { type: 'THEN', text: 'Assign to senior rep' },
      { type: 'THEN', text: 'Tag as High Intent Social Lead' },
    ],
  },
]

const INITIAL_WORKFLOWS = ADVANCED_TEMPLATES.map((template, index) => ({
  id: index + 1,
  name: template.name,
  status: template.id === 'risk-detection' ? 'paused' : 'active',
  runs: [94, 63, 128, 41, 117, 77, 34, 55, 19, 26][index] ?? 0,
  lastRun: ['2 min ago', '9 min ago', '4 min ago', '1 hr ago', '11 min ago', '28 min ago', '3 hr ago', '1 day ago', '2 days ago', '5 hr ago'][index] ?? 'Never',
  category: template.category,
  priority: template.priority ?? null,
  steps: template.steps,
}))

const WORKFLOW_FORM_INITIAL = {
  name: '',
  category: 'Lead Management',
  status: 'active',
  steps: [
    { type: 'IF', text: '' },
    { type: 'THEN', text: '' },
  ],
}

export default function AutomationPage() {
  const [workflows, setWorkflows] = useState(INITIAL_WORKFLOWS)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newWorkflow, setNewWorkflow] = useState(WORKFLOW_FORM_INITIAL)
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const stepsScrollRef = useRef(null)

  const toggleStatus = (id) => {
    setWorkflows((prev) =>
      prev.map((workflow) => {
        if (workflow.id !== id) return workflow
        const nextStatus = workflow.status === 'active' ? 'paused' : 'active'
        toast.success(`Workflow ${nextStatus === 'active' ? 'activated' : 'paused'}`)
        return { ...workflow, status: nextStatus }
      })
    )
  }

  const deleteWorkflow = (id) => {
    setWorkflows((prev) => prev.filter((workflow) => workflow.id !== id))
    toast.success('Workflow deleted')
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setSelectedTemplateId('')
    setNewWorkflow(WORKFLOW_FORM_INITIAL)
  }

  const openCreateModal = () => {
    setShowCreateModal(true)
  }

  const loadTemplate = () => {
    const template = ADVANCED_TEMPLATES.find((item) => item.id === selectedTemplateId)
    if (!template) {
      toast.error('Select a template first.')
      return
    }
    setNewWorkflow({
      name: template.name,
      category: template.category,
      status: 'active',
      steps: template.steps.map((step) => ({ ...step })),
    })
    toast.success('Template loaded into builder')
  }

  const updateStep = (index, key, value) => {
    setNewWorkflow((prev) => ({
      ...prev,
      steps: prev.steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [key]: value } : step
      ),
    }))
  }

  const addStep = () => {
    setNewWorkflow((prev) => ({
      ...prev,
      steps: [...prev.steps, { type: 'THEN', text: '' }],
    }))
    requestAnimationFrame(() => {
      if (stepsScrollRef.current) {
        stepsScrollRef.current.scrollTop = stepsScrollRef.current.scrollHeight
      }
    })
  }

  const removeStep = (index) => {
    setNewWorkflow((prev) => {
      if (prev.steps.length <= 2) {
        toast.error('At least 2 steps are required.')
        return prev
      }
      return {
        ...prev,
        steps: prev.steps.filter((_, stepIndex) => stepIndex !== index),
      }
    })
  }

  const createWorkflow = (e) => {
    e.preventDefault()
    const name = newWorkflow.name.trim()
    const cleanedSteps = newWorkflow.steps
      .map((step) => ({ type: step.type, text: step.text.trim() }))
      .filter((step) => step.text)

    if (!name) {
      toast.error('Workflow name is required.')
      return
    }
    if (!CATEGORY_COLORS[newWorkflow.category]) {
      toast.error('Select a valid category.')
      return
    }
    if (cleanedSteps.length < 2) {
      toast.error('Add at least 2 valid steps.')
      return
    }
    if (!cleanedSteps.some((step) => step.type === 'IF')) {
      toast.error('Workflow must include an IF step.')
      return
    }
    if (!cleanedSteps.some((step) => step.type === 'THEN')) {
      toast.error('Workflow must include a THEN step.')
      return
    }

    const nextId = workflows.length ? Math.max(...workflows.map((workflow) => workflow.id)) + 1 : 1
    const workflowToAdd = {
      id: nextId,
      name,
      status: newWorkflow.status,
      runs: 0,
      lastRun: 'Never',
      category: newWorkflow.category,
      priority: null,
      steps: cleanedSteps,
    }

    setWorkflows((prev) => [workflowToAdd, ...prev])
    toast.success('Workflow created')
    closeCreateModal()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500" /> Automation Engine
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {workflows.filter((workflow) => workflow.status === 'active').length} active workflows · {workflows.reduce((sum, workflow) => sum + workflow.runs, 0)} total runs
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[
          { label: 'Active Workflows', value: workflows.filter((workflow) => workflow.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Total Automations Run', value: workflows.reduce((sum, workflow) => sum + workflow.runs, 0), icon: Zap, color: 'text-amber-500' },
          { label: 'Paused Workflows', value: workflows.filter((workflow) => workflow.status === 'paused').length, icon: AlertTriangle, color: 'text-red-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-card p-5 flex items-center gap-4">
            <Icon className={`w-8 h-8 ${color}`} />
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {workflows.map((workflow) => (
          <motion.div key={workflow.id} layout className="glass-card p-5">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${workflow.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Zap className={`w-5 h-5 ${workflow.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-200">{workflow.name}</h3>
                    <span className={`badge text-[10px] ${CATEGORY_COLORS[workflow.category] ?? 'badge'}`}>{workflow.category}</span>
                    {workflow.priority === 'critical' && (
                      <span className="badge text-[10px] bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">CRITICAL</span>
                    )}
                    <span className={`badge text-[10px] ${workflow.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                      {workflow.status === 'active' ? '● Active' : '⏸ Paused'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    {workflow.steps.map((step, index) => (
                      <div key={`${step.type}-${index}`} className="contents">
                        {index > 0 && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${STEP_COLORS[step.type] ?? 'bg-slate-50 text-slate-700'}`}>
                          {step.type}: {step.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {workflow.runs} runs</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last: {workflow.lastRun}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => toggleStatus(workflow.id)}
                  className={`p-2 rounded-xl transition-colors ${workflow.status === 'active'
                    ? 'hover:bg-amber-50 dark:hover:bg-amber-950/20 text-slate-400 hover:text-amber-500'
                    : 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-slate-400 hover:text-emerald-500'}`}
                >
                  {workflow.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => deleteWorkflow(workflow.id)}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeCreateModal}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg p-3.5 md:p-4 z-10 max-h-[76vh] overflow-y-auto custom-scrollbar rounded-2xl border border-slate-200/20 dark:border-slate-700/40 shadow-glass dark:shadow-glass-dark bg-slate-900/95"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-200">Create New Workflow</h2>
                <button onClick={closeCreateModal} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/50">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Load Advanced Template</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="input text-sm py-2"
                  >
                    <option value="">Select template...</option>
                    {ADVANCED_TEMPLATES.map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={loadTemplate} className="btn-secondary whitespace-nowrap px-3 py-2 text-xs">Use Template</button>
                </div>
              </div>

              <form onSubmit={createWorkflow} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Workflow Name *</label>
                    <input
                      value={newWorkflow.name}
                      onChange={(e) => setNewWorkflow((prev) => ({ ...prev, name: e.target.value }))}
                      className="input py-2"
                      placeholder="Instagram High Budget Assignment"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Category</label>
                    <select
                      value={newWorkflow.category}
                      onChange={(e) => setNewWorkflow((prev) => ({ ...prev, category: e.target.value }))}
                      className="input py-2"
                    >
                      {Object.keys(CATEGORY_COLORS).map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Initial Status</label>
                    <select
                      value={newWorkflow.status}
                      onChange={(e) => setNewWorkflow((prev) => ({ ...prev, status: e.target.value }))}
                      className="input py-2"
                    >
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Workflow Chain Steps *</label>
                    <button type="button" onClick={addStep} className="btn-secondary text-xs px-2.5 py-1.5">Add Step</button>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">Scroll inside this box after adding steps.</p>
                  <div
                    ref={stepsScrollRef}
                    className="space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar rounded-xl border border-slate-200/70 dark:border-slate-700/50 p-2 bg-slate-50/40 dark:bg-slate-900/20"
                  >
                    {newWorkflow.steps.map((step, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <select
                          value={step.type}
                          onChange={(e) => updateStep(index, 'type', e.target.value)}
                          className="input col-span-1 sm:col-span-3 py-2"
                        >
                          {STEP_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        <input
                          value={step.text}
                          onChange={(e) => updateStep(index, 'text', e.target.value)}
                          className="input col-span-1 sm:col-span-8 py-2"
                          placeholder={
                            step.type === 'WAIT'
                              ? 'e.g. 30 minutes'
                              : step.type === 'CONDITION'
                              ? 'e.g. If no response then reassign'
                              : 'Describe this step'
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="col-span-1 sm:col-span-1 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500 justify-self-start sm:justify-self-auto"
                          title="Remove step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 -mx-4 md:-mx-5 mt-2 px-4 md:px-5 pt-3 pb-1 bg-gradient-to-t from-slate-50/95 via-slate-50/90 to-transparent dark:from-slate-900/95 dark:via-slate-900/85 dark:to-transparent border-t border-slate-200/60 dark:border-slate-700/40">
                  <div className="flex gap-2">
                    <button type="button" onClick={closeCreateModal} className="btn-secondary flex-1 py-2 text-sm">Cancel</button>
                    <button type="submit" className="btn-primary flex-1 py-2 text-sm">Create Workflow</button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
