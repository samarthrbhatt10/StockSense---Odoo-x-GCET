import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './EmptyState'

export type ColumnAlign = 'left' | 'right'

export type Column<T> = {
  key: string
  header: string
  cell: (row: T) => ReactNode
  className?: string
  align?: ColumnAlign
}

type DataTableProps<T> = {
  columns: Column<T>[]
  rows: T[] | undefined
  rowKey: (row: T) => string | number
  isLoading?: boolean
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

const SKELETON_ROWS = 6

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  emptyMessage = 'No records found',
  onRowClick,
}: DataTableProps<T>) {
  const alignClass = (align?: ColumnAlign) =>
    align === 'right' ? 'text-right' : 'text-left'

  const head = (
    <thead className="bg-muted/60">
      <tr className="border-b border-border">
        {columns.map((column) => (
          <th
            key={column.key}
            scope="col"
            className={cn(
              'px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase',
              alignClass(column.align),
              column.className,
            )}
          >
            {column.header}
          </th>
        ))}
      </tr>
    </thead>
  )

  if (isLoading) {
    return (
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-max text-sm">
          {head}
          <tbody>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <tr key={index} className="border-b border-border last:border-0">
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-3 py-3', alignClass(column.align))}>
                    <Skeleton className="h-4 w-full min-w-16" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <EmptyState title="Nothing here yet" description={emptyMessage} />
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-max text-sm">
        {head}
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border last:border-0',
                onRowClick && 'cursor-pointer transition-colors hover:bg-muted/50',
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('px-3 py-2.5 text-foreground', alignClass(column.align), column.className)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
