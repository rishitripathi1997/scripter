import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

export function Layout() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: api.unreadNotificationCount,
    refetchInterval: 30000,
  })

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">CX</span>
          <div>
            <strong>ConnectX Scripts</strong>
            <p>{user?.display_name || user?.username}</p>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/catalog">Script Catalog</NavLink>
          <NavLink to="/credentials">My Credentials</NavLink>
          <NavLink to="/proposals">My Proposals</NavLink>
          <NavLink to="/runs">My Runs</NavLink>
          <NavLink to="/notifications" className="nav-with-badge">
            Notifications
            {(unread?.count ?? 0) > 0 && <span className="nav-badge">{unread!.count}</span>}
          </NavLink>
          {isAdmin && (
            <>
              <div className="nav-section">Admin</div>
              <NavLink to="/admin/review">Review Queue</NavLink>
              <NavLink to="/admin/scripts">Script Permissions</NavLink>
              <NavLink to="/admin/audit">Audit</NavLink>
            </>
          )}
        </nav>
        <button className="btn btn-ghost logout-btn" onClick={() => logout()}>
          Log out
        </button>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
