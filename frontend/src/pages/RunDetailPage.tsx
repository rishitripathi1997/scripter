import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CardSkeleton, PageHeaderSkeleton } from '../components/ui/Skeleton'
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

  const isActive = run?.status === 'running' || run?.status === 'pending'

  if (isLoading || !run) {
    return (
      <div>
        <PageHeaderSkeleton />
        <div className="grid-two">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="run-detail-page">
      <header className="page-header">
        <Link to="/runs" className="back-link">← Back to my runs</Link>
        <h1>{run.script_name || 'Script run'}</h1>
        <div className="run-detail-status">
          <span className={`badge badge-${run.status}`}>{run.status}</span>
          {isActive && <span className="status-pulse" aria-hidden="true" />}
          {run.exit_code !== null && <span className="muted small">Exit code: {run.exit_code}</span>}
        </div>
      </header>

      <div className="grid-two">
        <div className="card">
          <h3>Inputs used</h3>
          <pre className="log-pre log-pre-inline">{JSON.stringify(run.input_snapshot, null, 2)}</pre>
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
          <pre className="log-pre">
            {logs?.stdout || (isActive ? 'Waiting for output…' : '(empty)')}
          </pre>
        </div>
        <div className="card">
          <h3>stderr</h3>
          <pre className="log-pre">{logs?.stderr || '(empty)'}</pre>
        </div>
      </div>
    </div>
  )
}
