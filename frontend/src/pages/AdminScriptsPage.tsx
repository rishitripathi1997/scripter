import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

type Tab = 'permissions' | 'settings' | 'deprecated'

const TABS: { id: Tab; label: string }[] = [
  { id: 'permissions', label: 'Permissions' },
  { id: 'settings', label: 'Settings & Deprecate' },
  { id: 'deprecated', label: 'Deprecated' },
]

export function AdminScriptsPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('permissions')
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [userIds, setUserIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])
  const [timeoutSeconds, setTimeoutSeconds] = useState('')
  const [deprecateReason, setDeprecateReason] = useState('')

  const { data: scripts, isLoading: scriptsLoading } = useQuery({
    queryKey: ['scripts'],
    queryFn: api.listScripts,
  })

  const { data: deprecated, isLoading: deprecatedLoading } = useQuery({
    queryKey: ['scripts-deprecated'],
    queryFn: api.listDeprecatedScripts,
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.listAdminUsers,
  })

  const selectedScript = scripts?.find((s) => s.id === selectedScriptId)

  const { data: permissions, isLoading: permsLoading } = useQuery({
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
    if (tab === 'deprecated') setTab('permissions')
  }

  const deprecatedCount = deprecated?.length ?? 0

  return (
    <div className="admin-page">
      <header className="page-header">
        <h1>Script Administration</h1>
        <p>Permissions, timeouts, and deprecation lifecycle</p>
      </header>

      <div className="tab-bar pill-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-pill ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'deprecated' && deprecatedCount > 0 && (
              <span className="tab-count">{deprecatedCount}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'deprecated' && (
        <section className="admin-panel">
          {deprecatedLoading && <CardSkeleton />}

          {!deprecatedLoading && !deprecated?.length && (
            <EmptyState
              title="No deprecated scripts"
              description="Deprecated scripts are hidden from the catalog but audit history is preserved."
            />
          )}

          {!deprecatedLoading && deprecated && deprecated.length > 0 && (
            <div className="card">
              <h3 className="panel-title">Deprecated scripts</h3>
              <ul className="deprecated-list">
                {deprecated.map((s) => (
                  <li key={s.id} className="deprecated-row">
                    <div>
                      <strong>{s.name}</strong>
                      <code className="small">{s.slug}</code>
                      {s.deprecation_reason && (
                        <p className="muted small">{s.deprecation_reason}</p>
                      )}
                    </div>
                    <button
                      className="btn btn-sm btn-primary"
                      type="button"
                      disabled={reactivateMutation.isPending}
                      onClick={() => reactivateMutation.mutate(s.id)}
                    >
                      Reactivate
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {tab !== 'deprecated' && (
        <div className="admin-split">
          <div className="card admin-script-list">
            <h3 className="panel-title">Active scripts</h3>
            {scriptsLoading && <CardSkeleton />}

            {!scriptsLoading && !scripts?.length && (
              <p className="muted small">No active scripts in catalog.</p>
            )}

            {!scriptsLoading && scripts && scripts.length > 0 && (
              <ul className="script-pick-list">
                {scripts.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`script-pick ${selectedScriptId === s.id ? 'active' : ''}`}
                      onClick={() => selectScript(s.id)}
                    >
                      <span className="script-pick-name">{s.name}</span>
                      <span className="script-pick-badges">
                        {s.run_restricted && <span className="badge badge-pending_review">restricted</span>}
                        {s.timeout_seconds && <span className="badge badge-draft">{s.timeout_seconds}s</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card admin-detail-panel">
            {!selectedScriptId && (
              <EmptyState
                title="Select a script"
                description="Choose a script from the list to manage permissions, timeout, or deprecation."
              />
            )}

            {selectedScriptId && tab === 'permissions' && (
              <div className="form-section">
                <div className="form-section-header">
                  <h3>Run permissions — {selectedScript?.name}</h3>
                  <p className="muted small">Leave all unchecked to allow every user. Restrict by user or role.</p>
                </div>

                {permsLoading && <CardSkeleton />}

                {!permsLoading && (
                  <>
                    <fieldset className="admin-fieldset">
                      <legend>Users</legend>
                      <div className="checkbox-grid">
                        {users?.map((u) => (
                          <label key={u.id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={userIds.includes(u.id)}
                              onChange={() =>
                                setUserIds((p) =>
                                  p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id]
                                )
                              }
                            />
                            <span>{u.display_name || u.username}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <fieldset className="admin-fieldset">
                      <legend>Roles</legend>
                      <div className="checkbox-grid">
                        {['user', 'admin'].map((role) => (
                          <label key={role} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={roles.includes(role)}
                              onChange={() =>
                                setRoles((p) =>
                                  p.includes(role) ? p.filter((x) => x !== role) : [...p, role]
                                )
                              }
                            />
                            <span>{role}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>

                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={savePermissions.isPending}
                      onClick={() => savePermissions.mutate()}
                    >
                      {savePermissions.isPending ? 'Saving…' : 'Save permissions'}
                    </button>
                  </>
                )}
              </div>
            )}

            {selectedScriptId && tab === 'settings' && (
              <div className="form-section">
                <div className="form-section-header">
                  <h3>Settings — {selectedScript?.name}</h3>
                </div>

                <div className="settings-block">
                  <h4>Timeout override</h4>
                  <p className="muted small">Leave empty to use platform default (600s).</p>
                  <div className="field">
                    <label htmlFor="timeout">Timeout (seconds)</label>
                    <input
                      id="timeout"
                      type="number"
                      min={30}
                      max={86400}
                      value={timeoutSeconds}
                      onChange={(e) => setTimeoutSeconds(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={saveTimeout.isPending}
                    onClick={() => saveTimeout.mutate()}
                  >
                    {saveTimeout.isPending ? 'Saving…' : 'Save timeout'}
                  </button>
                </div>

                <div className="settings-divider" />

                <div className="settings-block settings-danger">
                  <h4>Deprecate script</h4>
                  <p className="muted small">Removes from catalog. Existing audit logs are kept.</p>
                  <div className="field">
                    <label htmlFor="deprecate-reason">Reason</label>
                    <textarea
                      id="deprecate-reason"
                      value={deprecateReason}
                      onChange={(e) => setDeprecateReason(e.target.value)}
                      rows={3}
                      placeholder="Why is this script being deprecated?"
                    />
                  </div>
                  <button
                    className="btn btn-danger"
                    type="button"
                    disabled={!deprecateReason.trim() || deprecateMutation.isPending}
                    onClick={() => deprecateMutation.mutate()}
                  >
                    {deprecateMutation.isPending ? 'Deprecating…' : 'Deprecate script'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
