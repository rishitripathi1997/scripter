import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CardSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { api } from '../lib/api'

type ReviewAction = { id: string; type: 'reject' | 'changes' }

export function AdminReviewPage() {
  const queryClient = useQueryClient()
  const [actionFor, setActionFor] = useState<ReviewAction | null>(null)
  const [actionText, setActionText] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['review-queue'],
    queryFn: api.reviewQueue,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['review-queue'] })
    queryClient.invalidateQueries({ queryKey: ['scripts'] })
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.approveProposal(id),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectProposal(id, reason),
    onSuccess: () => {
      invalidate()
      setActionFor(null)
      setActionText('')
    },
  })

  const changesMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => api.requestChanges(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-queue'] })
      setActionFor(null)
      setActionText('')
    },
  })

  const startAction = (id: string, type: ReviewAction['type']) => {
    setActionFor({ id, type })
    setActionText('')
  }

  const submitAction = () => {
    if (!actionFor || !actionText.trim()) return
    if (actionFor.type === 'reject') {
      rejectMutation.mutate({ id: actionFor.id, reason: actionText.trim() })
    } else {
      changesMutation.mutate({ id: actionFor.id, notes: actionText.trim() })
    }
  }

  const pendingAction = rejectMutation.isPending || changesMutation.isPending

  return (
    <div className="admin-page">
      <header className="page-header row">
        <div>
          <h1>Review Queue</h1>
          <p>Approve script proposals submitted by team members</p>
        </div>
        {!isLoading && data && data.length > 0 && (
          <span className="admin-count-badge">{data.length} pending</span>
        )}
      </header>

      {isLoading && (
        <div className="proposal-list">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="Queue is empty"
          description="No proposals are waiting for review. New submissions will appear here."
        />
      )}

      <div className="proposal-list">
        {data?.map((p) => (
          <article key={p.id} className="card proposal-card">
            <div className="proposal-head">
              <div>
                <div className="proposal-title-row">
                  <h3>{p.name}</h3>
                  <span className="badge badge-pending_review">pending review</span>
                </div>
                <p className="muted">
                  <code>{p.slug}</code>
                  {p.description && <> — {p.description}</>}
                </p>
              </div>
            </div>

            <div className="proposal-meta-chips">
              <span className="meta-chip">
                <strong>{p.input_schema?.inputs?.length ?? 0}</strong> input fields
              </span>
              <span className="meta-chip">
                Creds: {p.credential_requirements?.required?.join(', ') || 'none'}
              </span>
            </div>

            {actionFor?.id === p.id ? (
              <div className="review-action-form">
                <label htmlFor={`action-${p.id}`}>
                  {actionFor.type === 'reject' ? 'Rejection reason' : 'Change request notes'}
                </label>
                <textarea
                  id={`action-${p.id}`}
                  rows={3}
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder={actionFor.type === 'reject' ? 'Why is this being rejected?' : 'What needs to change?'}
                />
                <div className="proposal-actions">
                  <button
                    className={`btn btn-sm ${actionFor.type === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                    type="button"
                    disabled={!actionText.trim() || pendingAction}
                    onClick={submitAction}
                  >
                    {pendingAction ? 'Submitting…' : actionFor.type === 'reject' ? 'Confirm reject' : 'Send request'}
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => { setActionFor(null); setActionText('') }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="proposal-actions">
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  disabled={approveMutation.isPending}
                  onClick={() => approveMutation.mutate(p.id)}
                >
                  Approve
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  type="button"
                  onClick={() => startAction(p.id, 'changes')}
                >
                  Request changes
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  type="button"
                  onClick={() => startAction(p.id, 'reject')}
                >
                  Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
