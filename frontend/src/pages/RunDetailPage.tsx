import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function RunDetailPage() {
  const { runId } = useParams<{ runId: string }>()

  const { data: run, isLoading } = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api.getRun(runId!),
    enabled: !!runId,
    refetchInterval: (query) =>
      query.state.data?.status === 'running' || query.state.data?.status === 'pending' ? 2000 : false,
  })

  const { data: logs } = useQuery({
    queryKey: ['run-logs', runId],
    queryFn: () => api.getRunLogs(runId!),
    enabled: !!runId && run && run.status !== 'pending' && run.status !== 'running',
  })

  if (isLoading || !run) return <p>Loading run...</p>

  return (
    <div>
      <header className="page-header">
        <Link to="/runs" className="muted small">← Back to my runs</Link>
        <h1>Run: {run.script_name || run.script_id}</h1>
        <p>
          Status: <span className={`badge badge-${run.status}`}>{run.status}</span>
          {run.exit_code !== null && <> · Exit code: {run.exit_code}</>}
        </p>
      </header>

      <div className="grid-two">
        <div className="card">
          <h3>Inputs used</h3>
          <pre className="log-pre">{JSON.stringify(run.input_snapshot, null, 2)}</pre>
        </div>
        <div className="card">
          <h3>Audit metadata</h3>
          <dl className="meta-dl">
            <dt>User</dt><dd>{run.username_snapshot}</dd>
            <dt>Credentials</dt><dd>{run.credentials_used.join(', ') || '—'}</dd>
            <dt>Started</dt><dd>{run.started_at ? new Date(run.started_at).toLocaleString() : '—'}</dd>
            <dt>Finished</dt><dd>{run.finished_at ? new Date(run.finished_at).toLocaleString() : '—'}</dd>
          </dl>
          {run.error_message && (
            <div className="alert alert-error">{run.error_message}</div>
          )}
        </div>
      </div>

      <div className="log-panels">
        <div className="card">
          <h3>stdout</h3>
          <pre className="log-pre">{logs?.stdout || (run.status === 'running' ? 'Running...' : '(empty)')}</pre>
        </div>
        <div className="card">
          <h3>stderr</h3>
          <pre className="log-pre">{logs?.stderr || '(empty)'}</pre>
        </div>
      </div>
    </div>
  )
}
