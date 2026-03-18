import { Navigate, Outlet } from 'react-router-dom'

export default function AdminGuard() {
  const key = localStorage.getItem('adminKey')
  const token = localStorage.getItem('token')
  if (!key && !token) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
