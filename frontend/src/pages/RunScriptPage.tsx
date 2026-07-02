import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { DynamicInputForm } from '../components/DynamicInputForm'
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

  if (isLoading) return <p>Loading script...</p>
  if (error || !script) return <div className="alert alert-error">Script not found</div>

  if (script.can_run === false) {
    return (
      <div className="alert alert-error">
        You do not have permission to run this script. Contact an admin.
      </div>
    )
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <Link to="/catalog" className="muted small">← Back to catalog</Link>
          <h1>Run: {script.name}</h1>
          <p>{script.description || 'Fill in the inputs below and run with your credentials.'}</p>
        </div>
      </header>

      {missingCreds.length > 0 && (
        <div className="alert alert-error">
          Missing credentials: {missingCreds.join(', ')}.{' '}
          <Link to="/credentials">Add them in My Credentials</Link> first.
        </div>
      )}

      {runError && <div className="alert alert-error">{runError}</div>}

      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Required credentials (from your vault)</h3>
        <ul className="cred-list">
          {required.length === 0 && <li className="muted">None required</li>}
          {required.map((key) => {
            const ok =
              savedKeys.has(key) || (hasSts && ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN'].includes(key))
            return (
              <li key={key}>
                <code>{key}</code>{' '}
                {ok ? (
                  <span className="badge badge-success">configured</span>
                ) : (
                  <span className="badge badge-rejected">missing</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <DynamicInputForm
        fields={script.input_schema?.inputs ?? []}
        onSubmit={(inputs) => runMutation.mutate(inputs)}
        submitting={runMutation.isPending}
      />

      <p className="muted small" style={{ marginTop: '1rem' }}>
        Runs execute in the background. You will be redirected to the run page to watch progress.
      </p>
    </div>
  )
}
