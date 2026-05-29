import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect, Component } from 'react'
import MainLayout from './components/layout/MainLayout'
import AuthLayout from './components/layout/AuthLayout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LeadsPage from './pages/LeadsPage'
import KanbanPage from './pages/KanbanPage'
import CustomersPage from './pages/CustomersPage'
import CommunicationPage from './pages/CommunicationPage'
import AIEnginePage from './pages/AIEnginePage'
import AutomationPage from './pages/AutomationPage'
import InvoicesPage from './pages/InvoicesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import TeamPage from './pages/TeamPage'
import SettingsPage from './pages/SettingsPage'
import IntegrationsPage from './pages/IntegrationsPage'
import ProfilePage from './pages/ProfilePage'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { authAPI } from './services/api'
import { PERMISSIONS, hasPermission } from './utils/permissions'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  render() {
    if (this.state.error) {
      const showDebug = import.meta.env.DEV
      return (
        <div style={{ padding: 32, fontFamily: 'monospace' }}>
          <h2 style={{ color: '#ef4444' }}>Something went wrong</h2>
          <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
            {showDebug ? `${this.state.error?.message}\n\n${this.state.error?.stack}` : 'An unexpected UI error occurred. Please reload and try again.'}
          </pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PrivateRoute({ children }) {
  const { isAuthenticated, authBootstrapped } = useAuthStore()
  if (!authBootstrapped) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Checking session...</div>
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PermissionRoute({ permission, children }) {
  const { user, authBootstrapped } = useAuthStore()
  if (!authBootstrapped) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Checking session...</div>
  }
  return hasPermission(user, permission) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  const { theme } = useThemeStore()
  const { authBootstrapped, setSessionFromUser, markAuthBootstrapped } = useAuthStore()
  const isDark = theme === 'dark'

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme, isDark])

  useEffect(() => {
    if (authBootstrapped) return
    let alive = true
    ;(async () => {
      try {
        const me = await authAPI.me()
        if (!alive) return
        if (useAuthStore.getState().authBootstrapped) return
        setSessionFromUser(me)
      } catch (err) {
        if (!alive) return
        if (useAuthStore.getState().authBootstrapped) return
        const state = useAuthStore.getState()
        const isNetworkError =
          err?.code === 'ERR_NETWORK' ||
          err?.code === 'ECONNABORTED' ||
          (typeof err?.message === 'string' && err.message.toLowerCase().includes('network'))
        if (isNetworkError && state.isAuthenticated) {
          markAuthBootstrapped()
          return
        }
        setSessionFromUser(null)
      }
    })()
    return () => { alive = false }
  }, [authBootstrapped, markAuthBootstrapped, setSessionFromUser])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: isDark ? '#1e293b' : '#fff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
          },
        }}
      />
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        {/* App routes */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<PermissionRoute permission={PERMISSIONS.DASHBOARD_VIEW}><DashboardPage /></PermissionRoute>} />
          <Route path="/leads" element={<PermissionRoute permission={PERMISSIONS.LEADS_READ}><LeadsPage /></PermissionRoute>} />
          <Route path="/pipeline" element={<PermissionRoute permission={PERMISSIONS.DEALS_READ}><KanbanPage /></PermissionRoute>} />
          <Route path="/customers" element={<PermissionRoute permission={PERMISSIONS.CUSTOMERS_READ}><CustomersPage /></PermissionRoute>} />
          <Route path="/communication" element={<PermissionRoute permission={PERMISSIONS.COMMUNICATIONS_READ}><CommunicationPage /></PermissionRoute>} />
          <Route path="/ai-engine" element={<PermissionRoute permission={PERMISSIONS.AI_USE}><AIEnginePage /></PermissionRoute>} />
          <Route path="/automation" element={<PermissionRoute permission={PERMISSIONS.WORKFLOWS_VIEW}><AutomationPage /></PermissionRoute>} />
          <Route path="/invoices" element={<PermissionRoute permission={PERMISSIONS.INVOICES_READ}><InvoicesPage /></PermissionRoute>} />
          <Route path="/analytics" element={<PermissionRoute permission={PERMISSIONS.ANALYTICS_VIEW}><AnalyticsPage /></PermissionRoute>} />
          <Route path="/team" element={<PermissionRoute permission={PERMISSIONS.TEAM_VIEW}><TeamPage /></PermissionRoute>} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/integrations" element={<PermissionRoute permission={PERMISSIONS.INTEGRATIONS_VIEW}><IntegrationsPage /></PermissionRoute>} />
          <Route path="/settings" element={<PermissionRoute permission={PERMISSIONS.SETTINGS_VIEW}><SettingsPage /></PermissionRoute>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
