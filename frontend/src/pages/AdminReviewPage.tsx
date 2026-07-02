import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export function AdminReviewPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: api.reviewQueue,
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveProposal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectProposal(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['review-queue'] }),
  })

  const changesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => api.requestChanges(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['review-queue'] }),
  })

  return (
    <div>
      <header className="page-header">
        <h1>Review Queue</h1>
        <p>Approve script proposals submitted by team members</p>
      </header>

      {isLoading && <p>Loading...</p>}

      {!isLoading && data?.length === 0 && (
        <div className="card empty-state">No proposals pending review</div>
      )}

      <div className="proposal-list">
        {data?.map((p) => (
          <div key={p.id} className="card proposal-card">
            <div className="proposal-head">
              <div>
                <h3>{p.name}</h3>
                <p className="muted"><code>{p.slug}</code> — {p.description || 'No description'}</p>
              </div>
            </div>
            <div className="proposal-meta">
              <span>{p.input_schema?.inputs?.length ?? 0} input fields</span>
              <span>Required creds: {p.credential_requirements?.required?.join(', ') || 'none'}</span>
            </div>
            <div className="proposal-actions">
              <button className="btn btn-primary btn-sm" onClick={() => approveMutation.mutate(p.id)}>
                Approve
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  const notes = prompt('Notes for requested changes:')
                  if (notes) changesMutation.mutate({ id: p.id, notes })
                }}
              >
                Request changes
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => {
                  const reason = prompt('Rejection reason:')
                  if (reason) rejectMutation.mutate({ id: p.id, reason })
                }}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
