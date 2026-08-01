import { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  message: string
  action?: ReactNode
  headingLevel?: 'h1' | 'h2'
}

export function EmptyState({
  title,
  message,
  action,
  headingLevel = 'h2',
}: EmptyStateProps) {
  const Heading = headingLevel

  return (
    <section className="state-card state-card--empty">
      <div className="empty-orbit" aria-hidden="true">
        <span />
      </div>
      <div>
        <Heading>{title}</Heading>
        <p>{message}</p>
      </div>
      {action}
    </section>
  )
}
