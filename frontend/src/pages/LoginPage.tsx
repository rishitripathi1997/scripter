import { type FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export function LoginPage() {
  const { user, login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <aside className="login-brand" aria-hidden="true">
        <div className="login-brand-inner">
          <div className="login-logo">
            <span className="login-logo-mark">CX</span>
          </div>
          <h1 className="login-brand-title">ConnectX Scripts</h1>
          <p className="login-brand-tagline">
            Share, approve, and run Python scripts with per-user credentials and full audit logging.
          </p>
          <ul className="login-features">
            <li>
              <span className="login-feature-icon" aria-hidden="true">◇</span>
              Shared script catalog with admin approval
            </li>
            <li>
              <span className="login-feature-icon" aria-hidden="true">◇</span>
              Private credential vault per user
            </li>
            <li>
              <span className="login-feature-icon" aria-hidden="true">◇</span>
              Isolated runs and execution logs
            </li>
          </ul>
        </div>
        <div className="login-brand-glow" />
      </aside>

      <main className="login-main">
        <div className="login-form-wrap">
          <div className="login-top-bar">
            <ThemeToggle />
          </div>
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
            </div>

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="login-footer muted small">
            Internal use only. Contact your administrator for access.
          </p>
        </div>
      </main>
    </div>
  )
}
