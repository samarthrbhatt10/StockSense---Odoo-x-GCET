import type { Operation } from '../types'

interface AdjustmentLinesProps {
  operation: Operation
}

/** Placeholder: Recorded / Counted / Difference arrives with the adjustments task. */
export function AdjustmentLines(_props: AdjustmentLinesProps) {
  return <p className="text-sm text-muted-foreground">Adjustments coming next</p>
}
