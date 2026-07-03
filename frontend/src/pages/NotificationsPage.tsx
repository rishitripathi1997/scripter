import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { CardSkeleton } from '../components/ui/Skeleton'
import { api } from '../lib/api'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: api.listNotifications,
  })

  const markRead = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  const markAll = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
    },
  })

  return (
    <div>
      <header className="page-header row">
        <div>
          <h1>Notifications</h1>
          <p>Proposal reviews, run completions, and admin alerts</p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
          Mark all read
        </button>
      </header>

      {isLoading && (
        <div className="notification-list">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <EmptyState
          title="All caught up"
          description="You'll see notifications here when proposals are reviewed or runs complete."
        />
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="notification-list">
          {data.map((n) => (
            <div key={n.id} className={`card notification-item ${n.is_read ? 'read' : 'unread'}`}>
              <div className="notification-head">
                <span className={`badge badge-${n.type === 'error' ? 'rejected' : n.type === 'success' ? 'active' : 'pending_review'}`}>
                  {n.type}
                </span>
                <time className="muted small">{new Date(n.created_at).toLocaleString()}</time>
              </div>
              <h3>{n.title}</h3>
              <p>{n.message}</p>
              <div className="notification-actions">
                {n.link && <Link to={n.link} className="btn btn-sm btn-primary">Open</Link>}
                {!n.is_read && (
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => markRead.mutate(n.id)}>
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
