import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function MyRunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs', 'mine'],
    queryFn: api.listMyRuns,
  })

  return (
    <div>
      <header className="page-header">
        <h1>My Runs</h1>
        <p>Your private execution history — other users cannot see these</p>
      </header>

      {isLoading && <p>Loading...</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Script</th>
              <th>Status</th>
              <th>Started</th>
              <th>Exit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={5} className="muted">No runs yet. Run a script from the catalog.</td></tr>
            )}
            {data?.map((run) => (
              <tr key={run.id}>
                <td>{run.script_name || run.script_id}</td>
                <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                <td>{run.started_at ? new Date(run.started_at).toLocaleString() : '—'}</td>
                <td>{run.exit_code ?? '—'}</td>
                <td>
                  <Link className="btn btn-ghost btn-sm" to={`/runs/${run.id}`}>View logs</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
