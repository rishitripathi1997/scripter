import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

type Tab = 'permissions' | 'settings' | 'deprecated'

export function AdminScriptsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('permissions')
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [userIds, setUserIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [timeoutSeconds, setTimeoutSeconds] = useState<string>('')
  const [deprecateReason, setDeprecateReason] = useState('')

  const { data: scripts } = useQuery({
    queryKey: ['scripts'],
    queryFn: api.listScripts,
  })

  const { data: deprecated } = useQuery({
    queryKey: ['scripts-deprecated'],
    queryFn: api.listDeprecatedScripts,
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.listAdminUsers,
  })

  const selectedScript = scripts?.find((s) => s.id === selectedScriptId)

  const { data: permissions } = useQuery({
    queryKey: ['script-permissions', selectedScriptId],
    queryFn: () => api.getScriptPermissions(selectedScriptId!),
    enabled: !!selectedScriptId && tab === 'permissions',
  })

  useEffect(() => {
    if (permissions) {
      setUserIds(permissions.user_ids)
      setRoles(permissions.roles)
    }
  }, [permissions])

  useEffect(() => {
    if (selectedScript) {
      setTimeoutSeconds(selectedScript.timeout_seconds?.toString() ?? '')
    }
  }, [selectedScript])

  const savePermissions = useMutation({
    mutationFn: () =>
      api.updateScriptPermissions(selectedScriptId!, { user_ids: userIds, roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script-permissions', selectedScriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })

  const saveTimeout = useMutation({
    mutationFn: () =>
      api.updateScriptSettings(selectedScriptId!, {
        timeout_seconds: timeoutSeconds ? Number(timeoutSeconds) : null,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scripts'] }),
  })

  const deprecateMutation = useMutation({
    mutationFn: () => api.deprecateScript(selectedScriptId!, deprecateReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['scripts-deprecated'] })
      setSelectedScriptId(null)
      setDeprecateReason('')
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.reactivateScript(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['scripts-deprecated'] })
    },
  })

  const selectScript = (id: string) => {
    setSelectedScriptId(id)
    setUserIds([])
    setRoles([])
    setTab('permissions')
  }

  return (
    <div>
      <header className="page-header">
        <h1>Script Administration</h1>
        <p>Permissions, timeouts, and deprecation lifecycle</p>
      </header>

      <div className="tab-bar">
        <button className={`btn btn-sm ${tab === 'permissions' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('permissions')}>Permissions</button>
        <button className={`btn btn-sm ${tab === 'settings' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('settings')}>Settings & Deprecate</button>
        <button className={`btn btn-sm ${tab === 'deprecated' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('deprecated')}>Deprecated ({deprecated?.length ?? 0})</button>
      </div>

      {tab === 'deprecated' && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <h3>Deprecated scripts</h3>
          {!deprecated?.length && <p className="muted">No deprecated scripts</p>}
          <ul className="script-pick-list">
            {deprecated?.map((s) => (
              <li key={s.id} className="deprecated-row">
                <div>
                  <strong>{s.name}</strong>
                  <p className="muted small">{s.deprecation_reason}</p>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => reactivateMutation.mutate(s.id)}>
                  Reactivate
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab !== 'deprecated' && (
        <div className="grid-two" style={{ marginTop: '1rem' }}>
          <div className="card">
            <h3>Active scripts</h3>
            <ul className="script-pick-list">
              {scripts?.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`script-pick ${selectedScriptId === s.id ? 'active' : ''}`}
                    onClick={() => selectScript(s.id)}
                  >
                    <span>{s.name}</span>
                    <span>
                      {s.run_restricted && <span className="badge badge-pending_review">restricted</span>}
                      {s.timeout_seconds && <span className="badge badge-draft">{s.timeout_seconds}s</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            {!selectedScriptId && <p className="muted">Select a script</p>}

            {selectedScriptId && tab === 'permissions' && (
              <>
                <h3>Run permissions</h3>
                <fieldset>
                  <legend>Users</legend>
                  {users?.map((u) => (
                    <label key={u.id} className="checkbox-inline block-check">
                      <input type="checkbox" checked={userIds.includes(u.id)} onChange={() => setUserIds((p) => p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id])} />
                      {u.display_name || u.username}
                    </label>
                  ))}
                </fieldset>
                <fieldset>
                  <legend>Roles</legend>
                  {['user', 'admin'].map((role) => (
                    <label key={role} className="checkbox-inline block-check">
                      <input type="checkbox" checked={roles.includes(role)} onChange={() => setRoles((p) => p.includes(role) ? p.filter((x) => x !== role) : [...p, role])} />
                      {role}
                    </label>
                  ))}
                </fieldset>
                <button className="btn btn-primary" onClick={() => savePermissions.mutate()} disabled={savePermissions.isPending}>
                  Save permissions
                </button>
              </>
            )}

            {selectedScriptId && tab === 'settings' && (
              <>
                <h3>Timeout override</h3>
                <p className="muted small">Leave empty to use platform default (600s).</p>
                <label>
                  Timeout (seconds)
                  <input type="number" min={30} max={86400} value={timeoutSeconds} onChange={(e) => setTimeoutSeconds(e.target.value)} />
                </label>
                <button className="btn btn-primary" onClick={() => saveTimeout.mutate()} disabled={saveTimeout.isPending}>
                  Save timeout
                </button>

                <hr style={{ margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)' }} />

                <h3>Deprecate script</h3>
                <p className="muted small">Removes from catalog. Existing audit logs are kept.</p>
                <label>
                  Reason
                  <textarea value={deprecateReason} onChange={(e) => setDeprecateReason(e.target.value)} rows={2} />
                </label>
                <button
                  className="btn btn-danger"
                  disabled={!deprecateReason || deprecateMutation.isPending}
                  onClick={() => deprecateMutation.mutate()}
                >
                  Deprecate script
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
