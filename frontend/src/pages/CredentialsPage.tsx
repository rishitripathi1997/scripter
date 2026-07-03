import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

export function CredentialsPage() {
  const queryClient = useQueryClient()
  const [key, setKey] = useState('BEARER_TOKEN')
  const [value, setValue] = useState('')
  const [roleArn, setRoleArn] = useState('')
  const [externalId, setExternalId] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['credentials'],
    queryFn: api.listCredentials,
  })

  const saveMutation = useMutation({
    mutationFn: () => api.upsertCredential(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
      setValue('')
    },
  })

  const stsMutation = useMutation({
    mutationFn: () =>
      api.upsertAwsSts({
        role_arn: roleArn,
        external_id: externalId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] })
      setRoleArn('')
      setExternalId('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (credentialKey: string) => api.deleteCredential(credentialKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['credentials'] }),
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    saveMutation.mutate()
  }

  const handleStsSubmit = (e: FormEvent) => {
    e.preventDefault()
    stsMutation.mutate()
  }

  return (
    <div className="credentials-page">
      <header className="page-header">
        <h1>My Credentials</h1>
        <p>Private to you — injected when you run scripts. Never visible to other users.</p>
      </header>

      <div className="cred-forms-grid">
        <form className="card form-section" onSubmit={handleSubmit}>
          <div className="form-section-header">
            <h3>Static credential</h3>
            <p className="muted small">Tokens, tenant IDs, API keys — stored as ENV variables</p>
          </div>
          <div className="field">
            <label htmlFor="cred-key">Key (ENV name)</label>
            <input
              id="cred-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="BEARER_TOKEN"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="cred-value">Value</label>
            <input
              id="cred-value"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Secret value"
              required
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving…' : 'Save credential'}
          </button>
        </form>

        <form className="card form-section" onSubmit={handleStsSubmit}>
          <div className="form-section-header">
            <h3>AWS STS</h3>
            <p className="muted small">
              Optional. Assume an IAM role at run time for AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN.
            </p>
          </div>
          <div className="field">
            <label htmlFor="role-arn">Role ARN</label>
            <input
              id="role-arn"
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/MyRole"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="external-id">External ID (optional)</label>
            <input
              id="external-id"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="external-id"
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={stsMutation.isPending}>
            {stsMutation.isPending ? 'Saving…' : 'Save AWS STS config'}
          </button>
        </form>
      </div>

      <section className="cred-vault-section">
        <h2 className="section-title">Saved credentials</h2>

        {isLoading && <TableSkeleton rows={3} cols={5} />}

        {!isLoading && data?.length === 0 && (
          <EmptyState
            title="No credentials saved yet"
            description="Add a static credential or AWS STS config above before running scripts."
          />
        )}

        {!isLoading && data && data.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Type</th>
                  <th>Masked</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((cred) => (
                  <tr key={cred.credential_key}>
                    <td><code>{cred.credential_key}</code></td>
                    <td><span className="badge">{cred.kind || 'static'}</span></td>
                    <td className="muted">{cred.masked_hint}</td>
                    <td className="small">{new Date(cred.updated_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        type="button"
                        onClick={() => deleteMutation.mutate(cred.credential_key)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
