import { NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { ThemeToggle } from './ui/ThemeToggle'

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    catalog: 'M4 6h16M4 10h16M4 14h16M4 18h16',
    credentials: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    proposals: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    runs: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    notifications: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    review: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
    scripts: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    audit: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  }
  const d = icons[name]
  if (!d) return null
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  )
}

function userInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Layout() {
  const { user, logout } = useAuth()
  const isAdmin = user?.role === 'admin'
  const displayName = user?.display_name || user?.username || ''

  const { data: unread } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: api.unreadNotificationCount,
    refetchInterval: 30000,
  })

  const navItem = (to: string, label: string, icon: string, end?: boolean) => (
    <NavLink to={to} end={end} className="nav-item">
      <NavIcon name={icon} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-mark">CX</span>
            <div className="brand-text">
              <strong>ConnectX</strong>
              <span>Scripts</span>
            </div>
          </div>

          <div className="user-chip">
            <span className="user-avatar" aria-hidden="true">
              {userInitials(displayName)}
            </span>
            <div className="user-chip-text">
              <strong>{displayName}</strong>
              <span>{user?.role === 'admin' ? 'Administrator' : 'Team member'}</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group-label">Workspace</div>
          {navItem('/', 'Dashboard', 'dashboard', true)}
          {navItem('/catalog', 'Script Catalog', 'catalog')}
          {navItem('/credentials', 'My Credentials', 'credentials')}
          {navItem('/proposals', 'My Proposals', 'proposals')}
          {navItem('/runs', 'My Runs', 'runs')}
          <NavLink to="/notifications" className="nav-item">
            <NavIcon name="notifications" />
            <span>Notifications</span>
            {(unread?.count ?? 0) > 0 && <span className="nav-badge">{unread!.count}</span>}
          </NavLink>

          {isAdmin && (
            <>
              <div className="nav-group-label">Administration</div>
              {navItem('/admin/review', 'Review Queue', 'review')}
              {navItem('/admin/scripts', 'Script Admin', 'scripts')}
              {navItem('/admin/audit', 'Audit', 'audit')}
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <ThemeToggle />
          <button className="btn btn-sidebar-logout" type="button" onClick={() => logout()}>
            Log out
          </button>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
