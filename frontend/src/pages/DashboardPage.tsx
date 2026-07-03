import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const cards = [
  {
    to: '/catalog',
    title: 'Script Catalog',
    desc: 'Browse and run approved shared scripts',
    letter: 'SC',
  },
  {
    to: '/credentials',
    title: 'My Credentials',
    desc: 'Manage tokens, AWS keys, and tenant IDs',
    letter: 'CR',
  },
  {
    to: '/proposals/new',
    title: 'Propose Script',
    desc: 'Submit a new script for admin review',
    letter: 'PS',
  },
  {
    to: '/runs',
    title: 'My Runs',
    desc: 'View execution history and logs',
    letter: 'MR',
  },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.display_name || user?.username}</p>
      </header>

      <div className="grid-cards">
        {cards.map((card) => (
          <Link key={card.to} to={card.to} className="card card-link dash-card">
            <span className="dash-card-icon" aria-hidden="true">
              {card.letter}
            </span>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
          </Link>
        ))}
        {user?.role === 'admin' && (
          <Link to="/admin/review" className="card card-link dash-card dash-card-admin">
            <span className="dash-card-icon" aria-hidden="true">
              RQ
            </span>
            <h3>Review Queue</h3>
            <p>Approve or reject script proposals</p>
          </Link>
        )}
      </div>
    </div>
  )
}
