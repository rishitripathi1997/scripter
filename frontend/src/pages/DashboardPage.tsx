import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.display_name || user?.username}</p>
      </header>
      <div className="grid-cards">
        <Link to="/catalog" className="card card-link">
          <h3>Script Catalog</h3>
          <p>Browse and run approved shared scripts</p>
        </Link>
        <Link to="/credentials" className="card card-link">
          <h3>My Credentials</h3>
          <p>Manage your tokens, AWS keys, and tenant IDs</p>
        </Link>
        <Link to="/proposals/new" className="card card-link">
          <h3>Propose Script</h3>
          <p>Submit a new script with custom inputs for admin review</p>
        </Link>
        <Link to="/runs" className="card card-link">
          <h3>My Runs</h3>
          <p>View your execution history and logs</p>
        </Link>
        {user?.role === 'admin' && (
          <Link to="/admin/review" className="card card-link">
            <h3>Review Queue</h3>
            <p>Approve or reject script proposals</p>
          </Link>
        )}
      </div>
    </div>
  )
}
