// ──────────────────────────────────────────
//  Mock data for NexaCRM AI demo
// ──────────────────────────────────────────

export const MOCK_KPI = {
  totalLeads:    { value: 1247, change: +12.4, period: 'vs last month' },
  totalDeals:    { value:  384, change:  +8.1, period: 'vs last month' },
  revenue:       { value: 4820000, change: +21.3, period: 'vs last month', currency: '₹' },
  overdueTasks:  { value:   23, change:  -5.6, period: 'vs last month' },
  conversionRate:{ value: 30.8, change:  +2.1, period: 'vs last month' },
  avgDealSize:   { value: 125521, change:  +9.7, period: 'vs last month', currency: '₹' },
}

export const MONTHLY_REVENUE = [
  { month: 'Oct', revenue: 2800000, deals: 42, leads: 180 },
  { month: 'Nov', revenue: 3200000, deals: 51, leads: 210 },
  { month: 'Dec', revenue: 2900000, deals: 44, leads: 195 },
  { month: 'Jan', revenue: 3600000, deals: 58, leads: 240 },
  { month: 'Feb', revenue: 4100000, deals: 65, leads: 270 },
  { month: 'Mar', revenue: 4820000, deals: 72, leads: 310 },
]

export const FUNNEL_DATA = [
  { stage: 'New Leads',     count: 1247, color: '#7c3aed' },
  { stage: 'Contacted',     count:  892, color: '#9333ea' },
  { stage: 'Qualified',     count:  541, color: '#c026d3' },
  { stage: 'Proposal',      count:  284, color: '#db2777' },
  { stage: 'Negotiation',   count:  148, color: '#f59e0b' },
  { stage: 'Won',           count:   72, color: '#10b981' },
]

export const LEAD_SOURCES = [
  { name: 'Facebook',  value: 32, color: '#1877f2' },
  { name: 'Instagram', value: 18, color: '#e1306c' },
  { name: 'LinkedIn',  value: 15, color: '#0077b5' },
  { name: 'Website',   value: 22, color: '#8b5cf6' },
  { name: 'WhatsApp',  value:  8, color: '#25d366' },
  { name: 'Referral',  value:  5, color: '#f59e0b' },
]

export const MOCK_LEADS = [
  { id: 1, name: 'Ramesh Patel',      email: 'ramesh@techcorp.in',    phone: '+91-98765-43210', company: 'Tech Corp',      source: 'Facebook',  score: 'hot',  status: 'new',        assignedTo: 'Priya S.', value: 125000,  createdAt: '2026-04-25', tags: ['enterprise'] },
  { id: 2, name: 'Arjun Sharma',      email: 'arjun@globalsoft.com',  phone: '+91-87654-32109', company: 'GlobalSoft',     source: 'LinkedIn',  score: 'warm', status: 'contacted',  assignedTo: 'Rahul M.', value: 85000,   createdAt: '2026-04-24', tags: ['smb'] },
  { id: 3, name: 'Divya Nair',        email: 'divya@infosys.com',     phone: '+91-76543-21098', company: 'InfoSys Ltd.',   source: 'Website',   score: 'hot',  status: 'qualified',  assignedTo: 'Priya S.', value: 250000,  createdAt: '2026-04-23', tags: ['enterprise', 'priority'] },
  { id: 4, name: 'Kiran Mehta',       email: 'kiran@startup.io',      phone: '+91-65432-10987', company: 'StartUp.io',    source: 'Instagram', score: 'cold', status: 'new',        assignedTo: 'Amit K.', value: 35000,   createdAt: '2026-04-22', tags: ['startup'] },
  { id: 5, name: 'Sunita Rao',        email: 'sunita@wipro.com',      phone: '+91-54321-09876', company: 'Wipro',         source: 'WhatsApp',  score: 'warm', status: 'proposal',   assignedTo: 'Rahul M.', value: 420000,  createdAt: '2026-04-21', tags: ['enterprise'] },
  { id: 6, name: 'Vijay Kumar',       email: 'vijay@hcltech.com',     phone: '+91-43210-98765', company: 'HCL Tech',      source: 'LinkedIn',  score: 'hot',  status: 'negotiation',assignedTo: 'Priya S.', value: 580000,  createdAt: '2026-04-20', tags: ['enterprise', 'priority'] },
  { id: 7, name: 'Meera Krishnan',    email: 'meera@freshworks.com',  phone: '+91-32109-87654', company: 'Freshworks',    source: 'Facebook',  score: 'warm', status: 'contacted',  assignedTo: 'Amit K.', value: 145000,  createdAt: '2026-04-19', tags: ['saas'] },
  { id: 8, name: 'Rajesh Singh',      email: 'rajesh@mindtree.com',   phone: '+91-21098-76543', company: 'Mindtree',      source: 'Referral',  score: 'hot',  status: 'won',        assignedTo: 'Priya S.', value: 320000,  createdAt: '2026-04-18', tags: ['enterprise'] },
]

export const MOCK_DEALS = {
  new: [
    { id: 'd1', title: 'Tech Corp Expansion', company: 'Tech Corp', value: 125000, owner: 'Priya S.', dueDate: '2026-05-15', priority: 'high',   score: 'hot',  activities: 3 },
    { id: 'd2', title: 'StartUp SaaS Suite',  company: 'StartUp.io', value: 35000, owner: 'Amit K.',  dueDate: '2026-05-20', priority: 'low',   score: 'cold', activities: 1 },
  ],
  contacted: [
    { id: 'd3', title: 'GlobalSoft CRM',      company: 'GlobalSoft',  value: 85000, owner: 'Rahul M.', dueDate: '2026-05-12', priority: 'medium',score: 'warm', activities: 5 },
    { id: 'd4', title: 'Freshworks Integration',company:'Freshworks', value: 145000,owner: 'Amit K.',  dueDate: '2026-05-18', priority: 'medium',score: 'warm', activities: 4 },
  ],
  qualified: [
    { id: 'd5', title: 'InfoSys Enterprise',  company: 'InfoSys Ltd.', value: 250000,owner: 'Priya S.', dueDate: '2026-05-10', priority: 'high',  score: 'hot',  activities: 8 },
  ],
  proposal: [
    { id: 'd6', title: 'Wipro Cloud Suite',   company: 'Wipro',       value: 420000, owner: 'Rahul M.', dueDate: '2026-05-08', priority: 'high',  score: 'warm', activities: 12 },
    { id: 'd7', title: 'Mindtree Platform',   company: 'Mindtree',    value: 320000, owner: 'Priya S.', dueDate: '2026-05-06', priority: 'high',  score: 'hot',  activities: 9 },
  ],
  negotiation: [
    { id: 'd8', title: 'HCL Tech Package',    company: 'HCL Tech',    value: 580000, owner: 'Priya S.', dueDate: '2026-05-03', priority: 'high',  score: 'hot',  activities: 15 },
  ],
  won: [
    { id: 'd9', title: 'Bajaj Finserv CRM',   company: 'Bajaj Finserv', value: 480000,owner: 'Rahul M.', dueDate: '2026-04-28', priority: 'high', score: 'hot',  activities: 22 },
  ],
  lost: [
    { id: 'd10', title: 'Tata Comm Deal',     company: 'Tata Comm',   value: 200000, owner: 'Amit K.',  dueDate: '2026-04-20', priority: 'medium',score: 'cold', activities: 6 },
  ],
}

export const MOCK_ACTIVITY = [
  { id: 1, type: 'lead',    text: 'New lead Ramesh Patel from Facebook',       time: '2 min ago',  user: 'System',   avatar: '🤖' },
  { id: 2, type: 'deal',    text: 'Wipro Cloud Suite moved to Proposal',        time: '15 min ago', user: 'Rahul M.',  avatar: 'R' },
  { id: 3, type: 'ai',      text: 'AI scored HCL Tech Package as Hot 🔥',      time: '32 min ago', user: 'AI Engine', avatar: '✨' },
  { id: 4, type: 'invoice', text: 'Invoice INV-1042 paid by Bajaj Finserv',    time: '1 hr ago',   user: 'System',   avatar: '🤖' },
  { id: 5, type: 'call',    text: 'Call logged with Divya Nair (InfoSys)',      time: '2 hr ago',   user: 'Priya S.', avatar: 'P' },
  { id: 6, type: 'note',    text: 'Note added to Mindtree Platform deal',       time: '3 hr ago',   user: 'Priya S.', avatar: 'P' },
  { id: 7, type: 'email',   text: 'Proposal email sent to Wipro',              time: '4 hr ago',   user: 'Rahul M.',  avatar: 'R' },
]

export const TEAM_PERFORMANCE = [
  { name: 'Priya S.',  leads: 42, deals: 18, revenue: 1820000, convRate: 42.8, rank: 1, badge: '🏆' },
  { name: 'Rahul M.',  leads: 38, deals: 15, revenue: 1450000, convRate: 39.5, rank: 2, badge: '🥈' },
  { name: 'Amit K.',   leads: 31, deals: 10, revenue: 980000,  convRate: 32.3, rank: 3, badge: '🥉' },
]

export const AI_INSIGHTS = [
  { id: 1, type: 'prediction', title: 'High Win Probability',   body: 'HCL Tech Package has 89% win probability. Schedule a demo call this week.', action: 'Schedule Call' },
  { id: 2, type: 'warning',    title: 'At-Risk Deal',           body: 'Wipro Cloud Suite has been stalled for 8 days. Consider sending a follow-up.', action: 'Send Follow-up' },
  { id: 3, type: 'opportunity',title: 'Upsell Opportunity',     body: 'Bajaj Finserv (existing customer) may be ready for add-ons based on usage.', action: 'View Profile' },
  { id: 4, type: 'insight',    title: 'Best Contact Time',      body: 'Leads from LinkedIn respond 3x better between 10am–12pm on weekdays.', action: 'Plan Campaign' },
]
