import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

const statusLabel: Record<string, string> = {
  draft: 'Draft',
  pending_review: 'Pending review',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
  active: 'Active',
  deprecated: 'Deprecated',
}

export function ProposalsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: api.listProposals,
  })

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.submitProposal(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['proposals'] }),
  })

  return (
    <div>
      <header className="page-header row">
        <div>
          <h1>My Proposals</h1>
          <p>Scripts you submitted for admin approval</p>
        </div>
        <Link className="btn btn-primary" to="/proposals/new">Propose new script</Link>
      </header>

      {isLoading && <p>Loading...</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Inputs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && data?.length === 0 && (
              <tr><td colSpan={5} className="muted">No proposals yet</td></tr>
            )}
            {data?.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td>
                <td><code>{p.slug}</code></td>
                <td><span className={`badge badge-${p.status}`}>{statusLabel[p.status] || p.status}</span></td>
                <td>{p.input_schema?.inputs?.length ?? 0}</td>
                <td>
                  {['draft', 'changes_requested', 'rejected'].includes(p.status) && (
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => submitMutation.mutate(p.id)}
                      disabled={submitMutation.isPending}
                    >
                      Submit for review
                    </button>
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
