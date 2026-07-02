import { type FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    <div>
      <header className="page-header">
        <h1>My Credentials</h1>
        <p>Private to you — used when you run scripts. Never shared with other users.</p>
      </header>

      <form className="card form-card" onSubmit={handleSubmit}>
        <h3>Static credential (token, tenant ID, etc.)</h3>
        <label>
          Key (ENV name)
          <input value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} placeholder="BEARER_TOKEN" required />
        </label>
        <label>
          Value
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Secret value" required />
        </label>
        <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
          Save credential
        </button>
      </form>

      <form className="card form-card" onSubmit={handleStsSubmit} style={{ marginTop: '1rem' }}>
        <h3>AWS STS (short-lived credentials)</h3>
        <p className="muted small">
          Configure an IAM role to assume at run time. Satisfies AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_SESSION_TOKEN requirements.
        </p>
        <label>
          Role ARN
          <input value={roleArn} onChange={(e) => setRoleArn(e.target.value)} placeholder="arn:aws:iam::123456789012:role/MyRole" required />
        </label>
        <label>
          External ID (optional)
          <input value={externalId} onChange={(e) => setExternalId(e.target.value)} placeholder="external-id" />
        </label>
        <button className="btn btn-primary" type="submit" disabled={stsMutation.isPending}>
          Save AWS STS config
        </button>
      </form>

      <div className="table-wrap" style={{ marginTop: '1.5rem' }}>
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
            {isLoading && (
              <tr><td colSpan={5}>Loading...</td></tr>
            )}
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={5} className="muted">No credentials saved yet</td></tr>
            )}
            {data?.map((cred) => (
              <tr key={cred.credential_key}>
                <td><code>{cred.credential_key}</code></td>
                <td>{cred.kind || 'static'}</td>
                <td>{cred.masked_hint}</td>
                <td>{new Date(cred.updated_at).toLocaleString()}</td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
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
    </div>
  )
}
