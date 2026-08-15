import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import BrandLogo from '../components/brand/BrandLogo'

export default function RegisterPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="lg:hidden mb-6">
        <BrandLogo variant="wordmark" size="md" tone="dark" className="max-w-[260px]" />
      </div>

      <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-300 px-3 py-1 text-xs font-semibold">
        <ShieldAlert className="w-4 h-4" />
        Invitation only
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white">Request Access</h2>
        <p className="text-slate-400 text-sm mt-1">
          This workspace is invite-based, so registration is handled by your admin team.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4 text-sm text-slate-300">
        <p>What to do next:</p>
        <ul className="list-disc pl-5 space-y-1 text-slate-400">
          <li>Ask your workspace admin to invite your email address.</li>
          <li>Use the login screen once your account is provisioned.</li>
          <li>Contact support if your invite hasn’t arrived.</li>
        </ul>
      </div>

      <Link
        to="/login"
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>
    </motion.div>
  )
}
