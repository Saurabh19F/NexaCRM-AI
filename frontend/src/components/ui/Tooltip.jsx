/**
 * MUI-inspired Tooltip component
 * Hover info for icons, buttons, and labels
 */
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export default function Tooltip({ children, title, placement = 'top', arrow = true, delay = 300 }) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef(null)

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setOpen(true), delay)
  }
  const handleLeave = () => {
    clearTimeout(timerRef.current)
    setOpen(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowPositions = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-800 dark:border-t-slate-200 border-x-transparent border-b-transparent border-4',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-800 dark:border-b-slate-200 border-x-transparent border-t-transparent border-4',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-800 dark:border-l-slate-200 border-y-transparent border-r-transparent border-4',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-800 dark:border-r-slate-200 border-y-transparent border-l-transparent border-4',
  }

  const initial = {
    top: { opacity: 0, y: 4, scale: 0.95 },
    bottom: { opacity: 0, y: -4, scale: 0.95 },
    left: { opacity: 0, x: 4, scale: 0.95 },
    right: { opacity: 0, x: -4, scale: 0.95 },
  }

  if (!title) return children

  return (
    <span className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={handleLeave} onFocus={handleEnter} onBlur={handleLeave}>
      {children}
      <AnimatePresence>
        {open && (
          <motion.span
            role="tooltip"
            initial={initial[placement]}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={initial[placement]}
            transition={{ duration: 0.12 }}
            className={`absolute z-[9999] pointer-events-none ${positions[placement]}`}
          >
            <span className="block px-2.5 py-1.5 text-[11px] font-medium text-white dark:text-slate-900 bg-slate-800 dark:bg-slate-200 rounded-lg shadow-lg whitespace-nowrap max-w-[200px]">
              {title}
            </span>
            {arrow && <span className={`absolute ${arrowPositions[placement]}`} />}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}
