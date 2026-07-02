const API_BASE = import.meta.env.VITE_API_URL || ''

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    let message: string = res.statusText
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') {
        message = body.detail
      } else if (body.detail?.message) {
        message = body.detail.message
        if (body.detail.missing) {
          message += `: ${body.detail.missing.join(', ')}`
        }
      } else if (Array.isArray(body.detail)) {
        message = body.detail.map((d: { msg?: string }) => d.msg).join(', ')
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface User {
  id: string
  username: string
  display_name: string | null
  role: string
}

export interface ScriptSummary {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  input_schema: { inputs?: InputField[] }
  credential_requirements: { required?: string[]; optional?: string[] }
  approved_version: number
  published_at: string | null
  can_run?: boolean | null
  run_restricted?: boolean
}

export interface InputField {
  name: string
  label: string
  type: string
  required?: boolean
  default?: string | boolean | number | null
  options?: string[]
}

export interface CredentialMetadata {
  credential_key: string
  masked_hint: string
  kind?: string
  expires_at: string | null
  updated_at: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  is_read: boolean
  created_at: string
}

export interface ScriptPermissions {
  script_id: string
  restricted: boolean
  user_ids: string[]
  roles: string[]
}

export interface RunLogs {
  stdout: string
  stderr: string
}

export interface RunSummary {
  id: string
  script_id: string
  script_name: string | null
  status: string
  is_test_run: boolean
  input_snapshot: Record<string, unknown>
  credentials_used: string[]
  username_snapshot: string
  started_at: string | null
  finished_at: string | null
  exit_code: number | null
  error_message: string | null
  created_at: string
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/api/auth/me'),

  listScripts: () => request<ScriptSummary[]>('/api/scripts'),

  getScript: (id: string) => request<ScriptSummary>(`/api/scripts/${id}`),

  runScript: (id: string, inputs: Record<string, unknown>) =>
    request<RunSummary>(`/api/scripts/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    }),

  listProposals: () => request<ScriptSummary[]>('/api/proposals/mine'),

  createProposal: (body: unknown) =>
    request<ScriptSummary>('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  submitProposal: (id: string) =>
    request<ScriptSummary>(`/api/proposals/${id}/submit`, { method: 'POST' }),

  listCredentials: () => request<CredentialMetadata[]>('/api/credentials'),

  upsertCredential: (key: string, value: string) =>
    request<CredentialMetadata>(`/api/credentials/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  deleteCredential: (key: string) =>
    request<void>(`/api/credentials/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  listMyRuns: () => request<RunSummary[]>('/api/runs/mine'),

  getRun: (id: string) => request<RunSummary>(`/api/runs/${id}`),

  getRunLogs: (id: string) => request<RunLogs>(`/api/runs/${id}/logs`),

  listAllRuns: () => request<RunSummary[]>('/api/runs/all'),

  reviewQueue: () => request<ScriptSummary[]>('/api/admin/review-queue'),

  approveProposal: (id: string) =>
    request<ScriptSummary>(`/api/admin/proposals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    }),

  rejectProposal: (id: string, reason: string) =>
    request<ScriptSummary>(`/api/admin/proposals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  requestChanges: (id: string, notes: string) =>
    request<ScriptSummary>(`/api/admin/proposals/${id}/request-changes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  listNotifications: () => request<Notification[]>('/api/notifications'),
  unreadNotificationCount: () => request<{ count: number }>('/api/notifications/unread-count'),
  markNotificationRead: (id: string) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () =>
    request<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' }),

  upsertAwsSts: (body: { role_arn: string; external_id?: string; session_name?: string }) =>
    request<CredentialMetadata>('/api/credentials/aws-sts', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  listAdminUsers: () => request<User[]>('/api/admin/users'),
  getScriptPermissions: (scriptId: string) =>
    request<ScriptPermissions>(`/api/admin/scripts/${scriptId}/permissions`),
  updateScriptPermissions: (scriptId: string, body: { user_ids: string[]; roles: string[] }) =>
    request<ScriptPermissions>(`/api/admin/scripts/${scriptId}/permissions`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  exportAuditCsv: async () => {
    const res = await fetch(`${API_BASE}/api/admin/audit/export`, { credentials: 'include' })
    if (!res.ok) throw new ApiError(res.status, 'Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `connectx-audit-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },
}
