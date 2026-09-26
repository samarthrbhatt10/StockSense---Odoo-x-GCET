import { Link } from 'react-router'
import { PackagePlusIcon, TruckIcon } from 'lucide-react'
import { useAuth } from '@/app/AuthProvider'
import { PageHeader } from '@/components/common'
import { Button } from '@/components/ui/button'
import { formatLongDate, greeting } from '../utils'

export function DashboardHeader() {
  const { user } = useAuth()
  const firstName = user?.name.trim().split(/\s+/)[0]
  const title = firstName ? `${greeting()}, ${firstName}` : greeting()

  return (
    <PageHeader
      title={title}
      description={formatLongDate(new Date())}
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/operations/receipts/new">
              <PackagePlusIcon className="size-4" />
              New receipt
            </Link>
          </Button>
          <Button asChild>
            <Link to="/operations/deliveries/new">
              <TruckIcon className="size-4" />
              New delivery
            </Link>
          </Button>
        </>
      }
    />
  )
}
