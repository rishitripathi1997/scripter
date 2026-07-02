import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function CatalogPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scripts'],
    queryFn: api.listScripts,
  })

  return (
    <div>
      <header className="page-header">
        <h1>Script Catalog</h1>
        <p>Shared approved scripts — runs use your private credentials</p>
      </header>

      {isLoading && <p>Loading scripts...</p>}
      {error && <div className="alert alert-error">Failed to load scripts</div>}

      {!isLoading && data?.length === 0 && (
        <div className="card empty-state">
          <p>No approved scripts yet. Propose one or wait for admin approval.</p>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Inputs</th>
              <th>Credentials</th>
              <th>Access</th>
              <th>Version</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((script) => (
              <tr key={script.id}>
                <td>
                  <strong>{script.name}</strong>
                  {script.description && <div className="muted small">{script.description}</div>}
                </td>
                <td><code>{script.slug}</code></td>
                <td>{script.input_schema?.inputs?.length ?? 0} fields</td>
                <td>{script.credential_requirements?.required?.join(', ') || '—'}</td>
                <td>
                  {script.run_restricted ? (
                    script.can_run ? (
                      <span className="badge badge-active">allowed</span>
                    ) : (
                      <span className="badge badge-rejected">restricted</span>
                    )
                  ) : (
                    <span className="muted">all users</span>
                  )}
                </td>
                <td>v{script.approved_version}</td>
                <td>
                  {script.can_run !== false ? (
                    <Link className="btn btn-primary btn-sm" to={`/catalog/${script.id}/run`}>
                      Run
                    </Link>
                  ) : (
                    <span className="muted small">No access</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
