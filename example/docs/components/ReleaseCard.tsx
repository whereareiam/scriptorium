import { Card } from 'fumadocs-ui/components/card'
import { Badge } from '@scriptorium/ui'
import type { ReactNode } from 'react'

/** A project component: the example project ships it in docs/components/ReleaseCard.tsx. */
export default function ReleaseCard({
  version,
  stable = false,
  children,
}: {
  version: string
  stable?: boolean
  children: ReactNode
}) {
  return (
    <Card title={`Release ${version}`}>
      <Badge type={stable ? 'success' : 'warning'}>{stable ? 'Stable' : 'Preview'}</Badge>
      <div className="mt-2">{children}</div>
    </Card>
  )
}
