import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeftIcon, ArrowRightIcon, HistoryIcon } from 'lucide-react'
import { DataTable, ErrorState, StatusBadge, type Column } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import NotFoundPage from '@/app/NotFoundPage'
import { formatDate, formatDateTime, formatQty } from '@/lib/format'
import type { OperationKind } from '@/lib/types'
import { OperationActions } from '../components/OperationActions'
import { OperationLinesTable } from '../components/OperationLinesTable'
import { StatusStepper } from '../components/StatusStepper'
import { useOperation } from '../hooks'
import { resolveKind, type KindConfig } from '../kinds'
import type { Operation, OperationMove } from '../types'

export default function OperationDetailPage() {
  const { kind, id } = useParams()
  const resolved = resolveKind(kind)
  const operationId = Number(id)
  if (!resolved || !Number.isInteger(operationId) || operationId <= 0) return <NotFoundPage />

  return <OperationDetail kind={resolved.kind} config={resolved.config} id={operationId} />
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  )
}

function StockMovesCard({ operation }: { operation: Operation }) {
  const columns: Column<OperationMove>[] = [
    {
      key: 'product',
      header: 'Product',
      cell: (move) => <span className="font-medium">{move.productName}</span>,
    },
    {
      key: 'route',
      header: 'From → To',
      cell: (move) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {move.fromName} → {move.toName}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      align: 'right',
      cell: (move) => <span className="whitespace-nowrap tabular-nums">{formatQty(move.quantity)}</span>,
    },
    {
      key: 'time',
      header: 'Time',
      align: 'right',
      cell: (move) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(move.createdAt)}
        </span>
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock moves</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <DataTable columns={columns} rows={operation.moves} rowKey={(move) => move.id} />
        <Button variant="link" asChild className="h-auto px-0">
          <Link to={`/moves?search=${encodeURIComponent(operation.reference)}`}>
            <HistoryIcon />
            View in Move History
            <ArrowRightIcon />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function OperationDetail({
  kind,
  config,
  id,
}: {
  kind: OperationKind
  config: KindConfig
  id: number
}) {
  const operation = useOperation(id)
  const [checklist, setChecklist] = useState({ picked: false, packed: false })

  if (operation.isPending) {
    return (
      <div className="space-y-6">
        <DetailSkeleton />
      </div>
    )
  }

  if (operation.isError) return <ErrorState error={operation.error} onRetry={() => void operation.refetch()} />

  const data = operation.data
  // The URL says one kind, the document says another: not this page's business.
  if (!data || data.type !== config.type) return <NotFoundPage />

  const hasActions = data.status !== 'DONE' && data.status !== 'CANCELED'

  return (
    <div className="space-y-6">
      <div className="space-y-2 border-b border-border pb-5">
        <Link
          to={`/operations/${kind}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to {config.labels.plural.toLowerCase()}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-foreground">
            {data.reference}
          </h1>
          <StatusBadge status={data.status} />
          <Badge variant="secondary">{config.labels.singular}</Badge>
        </div>
      </div>

      <StatusStepper status={data.status} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              {config.partnerLabel ? (
                <InfoRow label={config.partnerLabel}>{data.partnerName || '—'}</InfoRow>
              ) : null}
              <InfoRow label={config.singleLocation ? 'Location' : 'From'}>
                {config.singleLocation ? data.destLocation.fullName : data.sourceLocation.fullName}
              </InfoRow>
              {config.singleLocation ? null : (
                <InfoRow label="To">{data.destLocation.fullName}</InfoRow>
              )}
              <InfoRow label="Scheduled">
                <span className="flex flex-wrap items-center gap-1.5">
                  {formatDate(data.scheduledDate)}
                  {data.isLate ? (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">
                      Late
                    </Badge>
                  ) : null}
                </span>
              </InfoRow>
              <InfoRow label="Done at">{data.doneAt ? formatDateTime(data.doneAt) : '—'}</InfoRow>
              <InfoRow label="Created by">{data.createdBy.name}</InfoRow>
              <InfoRow label="Created">{formatDateTime(data.createdAt)}</InfoRow>
              {data.notes ? (
                <div className="space-y-0.5 sm:col-span-2">
                  <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Notes
                  </dt>
                  <dd className="text-sm whitespace-pre-wrap break-words">{data.notes}</dd>
                </div>
              ) : null}
            </dl>
          </CardContent>
        </Card>

        {hasActions ? (
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <OperationActions
                operation={data}
                config={config}
                kind={kind}
                checklist={checklist}
                onChecklistChange={setChecklist}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <OperationLinesTable operation={data} config={config} />
        </CardContent>
      </Card>

      {data.status === 'DONE' ? <StockMovesCard operation={data} /> : null}
    </div>
  )
}
