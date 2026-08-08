/**
 * MUI-inspired Stepper component
 * Step-by-step progress indicator for pipelines and workflows
 */
import { Check } from 'lucide-react'

export default function Stepper({
  steps = [],
  activeStep = 0,
  orientation = 'horizontal',
  variant = 'default',
  className = '',
}) {
  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col ${className}`}>
        {steps.map((step, i) => {
          const completed = i < activeStep
          const active = i === activeStep
          return (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0
                    ${completed ? 'bg-brand-500 text-white shadow-sm' :
                      active ? 'bg-brand-500 text-white shadow-md ring-4 ring-brand-100 dark:ring-brand-950/40' :
                      'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
                >
                  {completed ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 flex-1 min-h-[24px] my-1 rounded-full transition-colors ${
                    completed ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`} />
                )}
              </div>
              <div className="pb-6">
                <p className={`text-sm font-semibold leading-tight ${
                  active ? 'text-slate-900 dark:text-white' :
                  completed ? 'text-slate-700 dark:text-slate-300' :
                  'text-slate-400 dark:text-slate-500'
                }`}>{step.label}</p>
                {step.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Horizontal
  return (
    <div className={`flex items-start w-full ${className}`}>
      {steps.map((step, i) => {
        const completed = i < activeStep
        const active = i === activeStep
        return (
          <div key={i} className="flex-1 flex flex-col items-center relative">
            {/* Connector line */}
            {i > 0 && (
              <div className="absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2">
                <div className={`h-full rounded-full transition-all duration-500 ${
                  completed ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                }`} />
              </div>
            )}
            {/* Step circle */}
            <div
              className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${completed ? 'bg-brand-500 text-white shadow-sm' :
                  active ? 'bg-brand-500 text-white shadow-md ring-4 ring-brand-100 dark:ring-brand-950/40' :
                  'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}
            >
              {completed ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <p className={`mt-2 text-xs font-medium text-center leading-tight ${
              active ? 'text-slate-900 dark:text-white' :
              completed ? 'text-slate-600 dark:text-slate-400' :
              'text-slate-400 dark:text-slate-500'
            }`}>{step.label}</p>
            {step.description && (
              <p className="text-[10px] text-slate-400 text-center mt-0.5">{step.description}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
