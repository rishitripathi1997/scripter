import { Link } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

export function AdminAuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['runs', 'all'],
    queryFn: api.listAllRuns,
  })

  const exportMutation = useMutation({
    mutationFn: () => api.exportAuditCsv(),
  })

  const successCount = data?.filter((r) => r.status === 'success').length ?? 0
  const failedCount = data?.filter((r) => r.status === 'failed').length ?? 0

  return (
    <div className="admin-page">
      <header className="page-header row">
        <div>
          <h1>Audit — All Runs</h1>
          <p>Cross-user activity log. Credential values are never stored here.</p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || !data?.length}
        >
          {exportMutation.isPending ? 'Exporting…' : 'Export CSV'}
        </button>
      </header>

      {exportMutation.isSuccess && (
        <div className="alert alert-success">CSV export downloaded.</div>
      )}

      {exportMutation.isError && (
        <div className="alert alert-error">Export failed. Try again.</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="audit-stats">
          <div className="stat-card">
            <span className="stat-value">{data.length}</span>
            <span className="stat-label">Total runs</span>
          </div>
          <div className="stat-card stat-success">
            <span className="stat-value">{successCount}</span>
            <span className="stat-label">Successful</span>
          </div>
          <div className="stat-card stat-danger">
            <span className="stat-value">{failedCount}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      )}

      {isLoading && <TableSkeleton rows={6} cols={6} />}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="No audit records yet"
          description="Script runs from all users will appear here once execution begins."
        />
      )}

      {!isLoading && data && data.length > 0 && (
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
              {data.map((run) => (
                <tr key={run.id}>
                  <td><strong>{run.username_snapshot}</strong></td>
                  <td>{run.script_name || run.script_id}</td>
                  <td><span className={`badge badge-${run.status}`}>{run.status}</span></td>
                  <td className="small muted">
                    {run.credentials_used?.length
                      ? run.credentials_used.map((c) => <code key={c} className="cred-chip">{c}</code>)
                      : '—'}
                  </td>
                  <td className="small">{new Date(run.created_at).toLocaleString()}</td>
                  <td>
                    <Link className="btn btn-ghost btn-sm" to={`/runs/${run.id}`}>View</Link>
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
