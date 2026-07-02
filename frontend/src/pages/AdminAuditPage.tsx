import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs', 'all'],
    queryFn: api.listAllRuns,
  })

  const exportMutation = useMutation({
    mutationFn: () => api.exportAuditCsv(),
  })

  return (
    <div>
      <header className="page-header row">
        <div>
          <h1>Audit — All Runs</h1>
          <p>Cross-user activity log. Credential values are never stored here.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending}
        >
          {exportMutation.isPending ? 'Exporting...' : 'Export CSV'}
        </button>
      </header>

      {isLoading && <p>Loading...</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Script</th>
              <th>Status</th>
              <th>Credentials used</th>
              <th>When</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={6} className="muted">No runs recorded yet</td></tr>
            )}
            {data?.map((run) => (
              <tr key={run.id}>
                <td>{run.username_snapshot}</td>
                <td>{run.script_name || run.script_id}</td>
                <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                <td>{run.credentials_used?.join(', ') || '—'}</td>
                <td>{new Date(run.created_at).toLocaleString()}</td>
                <td>
                  <Link className="btn btn-ghost btn-sm" to={`/runs/${run.id}`}>View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
