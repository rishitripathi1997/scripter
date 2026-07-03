import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DynamicInputForm } from '../components/DynamicInputForm'
import { CardSkeleton, PageHeaderSkeleton } from '../components/ui/Skeleton'
import { api, ApiError } from '../lib/api'
import { getMissingCredentials } from '../lib/credentials'

export function RunScriptPage() {
  const { scriptId } = useParams<{ scriptId: string }>()
  const navigate = useNavigate()

  const { data: script, isLoading, error } = useQuery({
    queryKey: ['script', scriptId],
    queryFn: () => api.getScript(scriptId!),
    enabled: !!scriptId,
  })

  const { data: credentials } = useQuery({
    queryKey: ['credentials'],
    queryFn: api.listCredentials,
  })

  const runMutation = useMutation({
    mutationFn: (inputs: Record<string, unknown>) => api.runScript(scriptId!, inputs),
    onSuccess: (run) => navigate(`/runs/${run.id}`),
  })

  const required = script?.credential_requirements?.required ?? []
  const savedKeys = new Set(credentials?.map((c) => c.credential_key) ?? [])
  const missingCreds = getMissingCredentials(required, savedKeys)
  const hasSts = savedKeys.has('AWS_STS_CONFIG')

  const runError =
    runMutation.error instanceof ApiError ? runMutation.error.message : runMutation.error ? 'Run failed' : null

  if (isLoading) {
    return (
      <div>
        <PageHeaderSkeleton />
        <CardSkeleton />
        <div className="skeleton-mt"><CardSkeleton /></div>
      </div>
    )
  }

  if (error || !script) return <div className="alert alert-error">Script not found</div>

  if (script.can_run === false) {
    return (
      <div className="alert alert-error">
        You do not have permission to run this script. Contact an admin.
      </div>
    )
  }

  return (
    <div className="run-page">
      <header className="page-header">
        <Link to="/catalog" className="back-link">← Back to catalog</Link>
        <h1>Run: {script.name}</h1>
        <p>{script.description || 'Fill in the inputs below and run with your credentials.'}</p>
        <div className="run-meta">
          <span className="badge badge-active">v{script.approved_version}</span>
          {script.timeout_seconds && (
            <span className="muted small">Timeout: {script.timeout_seconds}s</span>
          )}
        </div>
      </header>

      {missingCreds.length > 0 && (
        <div className="alert alert-error">
          Missing credentials: {missingCreds.join(', ')}.{' '}
          <Link to="/credentials">Add them in My Credentials</Link> first.
        </div>
      )}

      {runError && <div className="alert alert-error">{runError}</div>}

      <div className="card run-cred-card">
        <h3>Required credentials</h3>
        <p className="muted small">Injected from your private vault at run time</p>
        <ul className="cred-status-list">
          {required.length === 0 && <li className="muted">None required</li>}
          {required.map((key) => {
            const ok =
              savedKeys.has(key) || (hasSts && ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'].includes(key))
            return (
              <li key={key} className={ok ? 'cred-ok' : 'cred-missing'}>
                <code>{key}</code>
                <span className={`badge ${ok ? 'badge-success' : 'badge-rejected'}`}>
                  {ok ? 'configured' : 'missing'}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <DynamicInputForm
        fields={script.input_schema?.inputs ?? []}
        onSubmit={(inputs) => runMutation.mutate(inputs)}
        submitting={runMutation.isPending}
        disabled={missingCreds.length > 0}
      />

      <p className="muted small run-hint">
        Runs execute in the background. You will be redirected to the run page to watch progress.
      </p>
    </div>
  )
}
