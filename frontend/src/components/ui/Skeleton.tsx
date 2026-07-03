import type { CSSProperties } from 'react'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
}

export function Skeleton({ className = '', width, height, rounded }: SkeletonProps) {
  const style: CSSProperties = {}
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <span
      className={`skeleton ${rounded ? 'skeleton-rounded' : ''} ${className}`.trim()}
      style={style}
      aria-hidden="true"
    />
  )
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height={14} width={`${50 + (i % 3) * 20}%`} /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height={16} width={`${40 + ((r + c) % 4) * 15}%`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card" aria-busy="true">
      <Skeleton height={20} width="45%" />
      <Skeleton height={14} width="80%" className="skeleton-mt" />
      <Skeleton height={14} width="60%" className="skeleton-mt-sm" />
    </div>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div className="page-header" aria-busy="true">
      <Skeleton height={32} width={220} />
      <Skeleton height={16} width={320} className="skeleton-mt-sm" />
    </div>
  )
}
