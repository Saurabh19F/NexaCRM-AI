import { Outlet, useLocation } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  )
}
