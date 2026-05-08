import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Shield, Plus, Trophy, Edit, Trash2, Crown, UserCheck, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { TEAM_PERFORMANCE } from '../utils/mockData'

const MOCK_TEAM = [
  { id: 1, name: 'Saurabh Kumar', email: 'saurabhke4@gmail.com', phone: '+91 9876543210', password: 'admin123', role: 'ADMIN', status: 'active', leads: 0, deals: 0, avatar: 'S', badge: '👑', joinedAt: '2025-01-01' },
  { id: 2, name: 'Priya Sharma', email: 'priya@nexacrm.com', phone: '+91 9876500011', password: 'manager123', role: 'MANAGER', status: 'active', leads: 42, deals: 18, avatar: 'P', badge: '🏆', joinedAt: '2025-03-15' },
  { id: 3, name: 'Rahul Mehta', email: 'rahul@nexacrm.com', phone: '+91 9876500022', password: 'sales123', role: 'SALES_EXEC', status: 'active', leads: 38, deals: 15, avatar: 'R', badge: '🥈', joinedAt: '2025-04-01' },
  { id: 4, name: 'Amit Kumar', email: 'amit@nexacrm.com', phone: '+91 9876500033', password: 'sales123', role: 'SALES_EXEC', status: 'active', leads: 31, deals: 10, avatar: 'A', badge: '🥉', joinedAt: '2025-05-10' },
  { id: 5, name: 'Neha Singh', email: 'neha@nexacrm.com', phone: '+91 9876500044', password: 'sales123', role: 'SALES_EXEC', status: 'inactive', leads: 12, deals: 4, avatar: 'N', badge: '', joinedAt: '2025-08-20' },
]

const ROLE_CONFIG = {
  ADMIN: { label: 'Admin', icon: Crown, cls: 'badge bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' },
  MANAGER: { label: 'Manager', icon: UserCheck, cls: 'badge bg-brand-100 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400' },
  SALES_EXEC: { label: 'Sales Exec', icon: User, cls: 'badge bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
}

const PERMISSIONS = {
  ADMIN: ['View all data', 'Manage users', 'Configure settings', 'View billing', 'All module access', 'Delete records'],
  MANAGER: ['View all data', 'Manage assigned team', 'View reports', 'Create campaigns', 'Export data'],
  SALES_EXEC: ['View own leads', 'Create & edit leads', 'Manage own deals', 'Log activities', 'View assigned customers'],
}

const buildPermissionState = () =>
  Object.fromEntries(
    Object.entries(PERMISSIONS).map(([role, permissions]) => [
      role,
      Object.fromEntries(permissions.map((permission) => [permission, true])),
    ])
  )

const MEMBER_FORM_INITIAL = {
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'SALES_EXEC',
  status: 'active',
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_REGEX = /^\+?[0-9\s-]{7,15}$/

export default function TeamPage() {
  const [team, setTeam] = useState(MOCK_TEAM)
  const [selectedRole, setSelectedRole] = useState('SALES_EXEC')
  const [permissionsByRole, setPermissionsByRole] = useState(buildPermissionState)
  const [memberModal, setMemberModal] = useState(null)
  const [memberForm, setMemberForm] = useState(MEMBER_FORM_INITIAL)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const closeMemberModal = () => {
    setMemberModal(null)
    setMemberForm(MEMBER_FORM_INITIAL)
  }

  const openInviteModal = () => {
    setMemberForm(MEMBER_FORM_INITIAL)
    setMemberModal({ mode: 'add', memberId: null })
  }

  const openEditModal = (member) => {
    setMemberForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      password: '',
      role: member.role,
      status: member.status,
    })
    setMemberModal({ mode: 'edit', memberId: member.id })
  }

  const getAdminCount = () => team.filter((member) => member.role === 'ADMIN').length

  const validateMemberForm = () => {
    const name = memberForm.name.trim()
    const email = memberForm.email.trim().toLowerCase()
    const phone = memberForm.phone.trim()
    const password = memberForm.password

    if (!name) {
      toast.error('Member name is required.')
      return null
    }
    if (!email) {
      toast.error('Member email is required.')
      return null
    }
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Enter a valid email address.')
      return null
    }
    if (!phone) {
      toast.error('Phone number is required.')
      return null
    }
    if (!PHONE_REGEX.test(phone)) {
      toast.error('Enter a valid phone number.')
      return null
    }
    if (memberModal?.mode === 'add' && !password) {
      toast.error('Password is required for new members.')
      return null
    }
    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return null
    }
    if (!ROLE_CONFIG[memberForm.role]) {
      toast.error('Select a valid role.')
      return null
    }
    if (!['active', 'inactive'].includes(memberForm.status)) {
      toast.error('Select a valid status.')
      return null
    }

    const duplicateEmail = team.some((member) =>
      member.email.toLowerCase() === email &&
      member.id !== memberModal?.memberId
    )
    if (duplicateEmail) {
      toast.error('A member with this email already exists.')
      return null
    }

    return { name, email, phone, password }
  }

  const handleMemberSubmit = (e) => {
    e.preventDefault()
    const validated = validateMemberForm()
    if (!validated) return

    const { name, email, phone, password } = validated
    const avatar = name.charAt(0).toUpperCase() || 'U'

    if (memberModal?.mode === 'add') {
      const nextId = team.length ? Math.max(...team.map((member) => member.id)) + 1 : 1
      setTeam((prev) => [
        ...prev,
        {
          id: nextId,
          name,
          email,
          phone,
          password,
          role: memberForm.role,
          status: memberForm.status,
          leads: 0,
          deals: 0,
          avatar,
          badge: '',
          joinedAt: new Date().toISOString().slice(0, 10),
        },
      ])
      toast.success(`Member invited: ${name}`)
      closeMemberModal()
      return
    }

    const currentMember = team.find((member) => member.id === memberModal?.memberId)
    if (!currentMember) {
      toast.error('Member not found.')
      closeMemberModal()
      return
    }

    if (currentMember.role === 'ADMIN' && memberForm.role !== 'ADMIN' && getAdminCount() <= 1) {
      toast.error('At least one admin account is required.')
      return
    }

    setTeam((prev) =>
      prev.map((member) => {
        if (member.id !== currentMember.id) return member
        const nextMember = {
          ...member,
          name,
          email,
          phone,
          role: memberForm.role,
          status: memberForm.status,
          avatar,
        }
        if (password) nextMember.password = password
        return nextMember
      })
    )
    toast.success(`Updated ${name}`)
    closeMemberModal()
  }

  const handleDeleteMember = (member) => {
    if (member.role === 'ADMIN' && getAdminCount() <= 1) {
      toast.error('Cannot delete the last admin account.')
      return
    }
    setDeleteTarget(member)
  }

  const confirmDeleteMember = () => {
    if (!deleteTarget) return
    setTeam((prev) => prev.filter((member) => member.id !== deleteTarget.id))
    toast.success(`Deleted ${deleteTarget.name}`)
    setDeleteTarget(null)
  }

  const togglePermission = (role, permission) => {
    setPermissionsByRole((prev) => {
      const nextEnabled = !prev[role][permission]
      const next = {
        ...prev,
        [role]: {
          ...prev[role],
          [permission]: nextEnabled,
        },
      }
      toast.success(`${permission} ${nextEnabled ? 'enabled' : 'disabled'} for ${ROLE_CONFIG[role].label}`)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-brand-500" /> Team & Roles
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{team.length} members · Role-based access control</p>
        </div>
        <button onClick={openInviteModal} className="btn-primary gap-1.5 text-sm">
          <Plus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team list */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-700/40 bg-slate-50/50 dark:bg-slate-800/30">
                {['Member', 'Role', 'Status', 'Performance', 'Actions'].map((h) => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/40">
              {team.map((member) => {
                const roleCfg = ROLE_CONFIG[member.role]
                return (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {member.avatar}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{member.name} {member.badge}</p>
                          <p className="text-xs text-slate-500">{member.email}</p>
                          <p className="text-xs text-slate-400">{member.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={roleCfg?.cls}>{roleCfg?.label}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${member.status === 'active' ? 'badge-won' : 'badge bg-slate-100 text-slate-500'}`}>
                        {member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {member.leads > 0 ? `${member.leads} leads · ${member.deals} deals` : 'Admin account'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-brand-500"
                          title={`Edit ${member.name}`}
                          aria-label={`Edit ${member.name}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(member)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-500"
                          title={`Delete ${member.name}`}
                          aria-label={`Delete ${member.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            </table>
          </div>
        </div>

        {/* Role Permissions */}
        <div className="glass-card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Role Permissions</h2>
          <div className="flex flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
            {Object.keys(PERMISSIONS).map((role) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex-1 min-w-[92px] py-1.5 text-xs font-medium rounded-lg transition-all
                  ${selectedRole === role ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm' : 'text-slate-500'}`}
              >
                {ROLE_CONFIG[role]?.label}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {Object.keys(permissionsByRole[selectedRole]).map((perm) => (
              <div key={perm} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0
                    ${permissionsByRole[selectedRole][perm] ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full
                      ${permissionsByRole[selectedRole][perm] ? 'bg-emerald-500' : 'bg-red-500'}`}
                  />
                </div>
                <span className={permissionsByRole[selectedRole][perm] ? '' : 'line-through opacity-70'}>{perm}</span>
                <button
                  onClick={() => togglePermission(selectedRole, perm)}
                  className={`ml-auto px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors
                    ${permissionsByRole[selectedRole][perm]
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
                    }`}
                >
                  {permissionsByRole[selectedRole][perm] ? 'Disable' : 'Enable'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Monthly Leaderboard</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEAM_PERFORMANCE.map((member) => (
            <div key={member.name} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-center">
              <div className="text-4xl mb-2">{member.badge}</div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{member.name}</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                ₹{(member.revenue / 100000).toFixed(1)}L
              </p>
              <div className="flex justify-center gap-4 mt-2 text-xs text-slate-500">
                <span>{member.leads} leads</span>
                <span>{member.deals} deals</span>
                <span>{member.convRate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {memberModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMemberModal}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative glass-card w-full max-w-lg p-6 z-10"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  {memberModal.mode === 'add' ? 'Invite Member' : 'Edit Member'}
                </h2>
                <button onClick={closeMemberModal} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Full Name *</label>
                    <input
                      value={memberForm.name}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="input"
                      placeholder="Ramesh Patel"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Email *</label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="input"
                      placeholder="ramesh@nexacrm.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Phone Number *</label>
                    <input
                      value={memberForm.phone}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="input"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Password {memberModal.mode === 'add' ? '*' : '(optional)'}
                    </label>
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="input"
                      placeholder={memberModal.mode === 'add' ? 'Enter password' : 'Leave blank to keep current password'}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Role</label>
                    <select
                      value={memberForm.role}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, role: e.target.value }))}
                      className="input"
                    >
                      {Object.keys(ROLE_CONFIG).map((roleKey) => (
                        <option key={roleKey} value={roleKey}>{ROLE_CONFIG[roleKey].label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">Status</label>
                    <select
                      value={memberForm.status}
                      onChange={(e) => setMemberForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="input"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeMemberModal} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" className="btn-primary flex-1">
                    {memberModal.mode === 'add' ? 'Invite Member' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteTarget(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative glass-card w-full max-w-md p-6 z-10"
            >
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Delete Member</h2>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to remove <span className="font-semibold text-slate-700 dark:text-slate-300">{deleteTarget.name}</span> from the team?
              </p>
              <div className="flex gap-3 pt-5">
                <button type="button" onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  type="button"
                  onClick={confirmDeleteMember}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
