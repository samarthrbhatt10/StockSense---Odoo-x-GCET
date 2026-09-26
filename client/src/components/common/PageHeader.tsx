import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { ArrowLeftIcon } from 'lucide-react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  backTo?: string
}

export function PageHeader({ title, description, actions, backTo }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        ) : null}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
