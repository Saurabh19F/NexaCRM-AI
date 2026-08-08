/**
 * MUI-inspired Accordion component
 * Expandable/collapsible content sections
 */
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export function Accordion({ children, defaultExpanded = false, className = '' }) {
  return <div className={`divide-y divide-slate-200/60 dark:divide-slate-700/40 rounded-2xl overflow-hidden ${className}`}>{children}</div>
}

export function AccordionItem({ title, subtitle, icon, children, defaultExpanded = false, className = '' }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`bg-white/50 dark:bg-slate-900/30 ${className}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
        aria-expanded={expanded}
      >
        {icon && <span className="flex-shrink-0 text-brand-500 [&>svg]:w-5 [&>svg]:h-5">{icon}</span>}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0 text-slate-400"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-slate-600 dark:text-slate-400">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Accordion
