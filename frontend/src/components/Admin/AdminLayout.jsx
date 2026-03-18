import { useNavigate, NavLink } from 'react-router-dom'

export default function AdminLayout({ children }) {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('adminKey')
    localStorage.removeItem('token')
    navigate('/admin/login')
  }

  return (
    <div className="admin-layout">
      <nav className="admin-nav">
        <span className="admin-nav-logo">Admin</span>
        <NavLink to="/admin"            end>Dashboard</NavLink>
        <NavLink to="/admin/places"        >Places</NavLink>
        <NavLink to="/admin/categories"    >Categories</NavLink>
        <NavLink to="/admin/add"           >+ Add</NavLink>
        <NavLink to="/admin/users"         >Users</NavLink>
        <NavLink to="/admin/tasks"         >Tasks</NavLink>
        <NavLink to="/admin/analytics"     >Analytics</NavLink>
        <NavLink to="/admin/activity"      >Activity</NavLink>
        <NavLink to="/admin/flags"         >Flags</NavLink>
        <NavLink to="/admin/import"        >Import</NavLink>
        <NavLink to="/admin/api-keys"      >API Keys</NavLink>
        <button onClick={logout}>Logout</button>
      </nav>
      <main className="admin-content">{children}</main>
    </div>
  )
}
