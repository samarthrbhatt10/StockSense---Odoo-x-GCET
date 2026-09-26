import { useParams } from 'react-router'
import { PageHeader } from '@/components/common'
import NotFoundPage from '@/app/NotFoundPage'
import { isOperationKind, KIND_TO_TYPE, OPERATION_LABELS } from '@/lib/types'

export default function OperationDetailPage() {
  const { kind } = useParams()
  if (!kind || !isOperationKind(kind)) return <NotFoundPage />

  return (
    <PageHeader
      title={OPERATION_LABELS[KIND_TO_TYPE[kind]].singular}
      description="Coming soon"
      backTo={`/operations/${kind}`}
    />
  )
}
