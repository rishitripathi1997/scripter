import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function AdminScriptsPage() {
  const queryClient = useQueryClient()
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [userIds, setUserIds] = useState<string[]>([])
  const [roles, setRoles] = useState<string[]>([])

  const { data: scripts } = useQuery({
    queryKey: ['scripts'],
    queryFn: api.listScripts,
  })

  const { data: users } = useQuery({
    queryKey: ['admin-users'],
    queryFn: api.listAdminUsers,
  })

  const { data: permissions } = useQuery({
    queryKey: ['script-permissions', selectedScriptId],
    queryFn: () => api.getScriptPermissions(selectedScriptId!),
    enabled: !!selectedScriptId,
  })

  useEffect(() => {
    if (permissions) {
      setUserIds(permissions.user_ids)
      setRoles(permissions.roles)
    }
  }, [permissions])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateScriptPermissions(selectedScriptId!, { user_ids: userIds, roles }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script-permissions', selectedScriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })

  const selectScript = (id: string) => {
    setSelectedScriptId(id)
    setUserIds([])
    setRoles([])
  }

  const toggleUser = (id: string) => {
    setUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleRole = (role: string) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]))
  }

  return (
    <div>
      <header className="page-header">
        <h1>Script Permissions</h1>
        <p>Restrict who can run a script. Empty selection = all users can run.</p>
      </header>

      <div className="grid-two">
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
                  {s.name}
                  {s.run_restricted && <span className="badge badge-pending_review">restricted</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          {!selectedScriptId && <p className="muted">Select a script to manage permissions</p>}
          {selectedScriptId && (
            <>
              <h3>Who can run this script</h3>
              <p className="muted small">Leave all unchecked to allow everyone.</p>

              <fieldset>
                <legend>Users</legend>
                {users?.map((u) => (
                  <label key={u.id} className="checkbox-inline block-check">
                    <input
                      type="checkbox"
                      checked={userIds.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                    />
                    {u.display_name || u.username} ({u.username})
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Roles</legend>
                {['user', 'admin'].map((role) => (
                  <label key={role} className="checkbox-inline block-check">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </fieldset>

              <button
                className="btn btn-primary"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Save permissions
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
