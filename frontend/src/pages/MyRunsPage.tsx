import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

export function MyRunsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs', 'mine'],
    queryFn: api.listMyRuns,
  })

  return (
    <div>
      <header className="page-header row">
        <div>
          <h1>My Runs</h1>
          <p>Your private execution history — other users cannot see these</p>
        </div>
        <Link className="btn btn-primary" to="/catalog">Run a script</Link>
      </header>

      {isLoading && <TableSkeleton rows={5} cols={5} />}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="No runs yet"
          description="Pick a script from the catalog and execute it with your credentials."
          action={<Link className="btn btn-primary" to="/catalog">Browse catalog</Link>}
        />
      )}

      {!isLoading && data && data.length > 0 && (
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
              {data.map((run) => (
                <tr key={run.id}>
                  <td><strong>{run.script_name || run.script_id}</strong></td>
                  <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                  <td className="small">{run.started_at ? new Date(run.started_at).toLocaleString() : '—'}</td>
                  <td>{run.exit_code ?? '—'}</td>
                  <td>
                    <Link className="btn btn-ghost btn-sm" to={`/runs/${run.id}`}>View logs</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
