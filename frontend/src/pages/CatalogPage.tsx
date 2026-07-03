import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { EmptyState } from '../components/ui/EmptyState'
import { TableSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

export function CatalogPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['scripts'],
    queryFn: api.listScripts,
  })

  return (
    <div>
      <header className="page-header row">
        <div>
          <h1>Script Catalog</h1>
          <p>Shared approved scripts — runs use your private credentials</p>
        </div>
        <Link className="btn btn-primary" to="/proposals/new">
          Propose script
        </Link>
      </header>

      {isLoading && <TableSkeleton rows={4} cols={7} />}

      {error && <div className="alert alert-error">Failed to load scripts</div>}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="No scripts in the catalog yet"
          description="Propose a script or wait for an admin to approve one."
          action={<Link className="btn btn-primary" to="/proposals/new">Propose a script</Link>}
        />
      )}

      {!isLoading && data && data.length > 0 && (
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
              {data.map((script) => (
                <tr key={script.id}>
                  <td>
                    <strong>{script.name}</strong>
                    {script.description && <div className="muted small">{script.description}</div>}
                  </td>
                  <td><code>{script.slug}</code></td>
                  <td>{script.input_schema?.inputs?.length ?? 0} fields</td>
                  <td className="cred-cell">
                    {script.credential_requirements?.required?.length
                      ? script.credential_requirements.required.map((k) => (
                          <code key={k} className="cred-chip">{k}</code>
                        ))
                      : <span className="muted">—</span>}
                  </td>
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
      )}
    </div>
  )
}
