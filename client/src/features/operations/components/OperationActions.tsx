import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  BadgeCheckIcon,
  CircleSlashIcon,
  LoaderCircleIcon,
  PackageSearchIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common'
import { Button } from '@/components/ui/button'
import {
  useCancelOperation,
  useCheckAvailability,
  useConfirmOperation,
  useDeleteOperation,
  useValidateOperation,
} from '../hooks'
import type { KindConfig } from '../kinds'
import type { Operation } from '../types'
import { describeValidationSummary } from '../utils'
import { DeliveryChecklist, type ChecklistState } from './DeliveryChecklist'

type PendingDialog = 'validate' | 'delete' | 'cancel' | null

interface OperationActionsProps {
  operation: Operation
  config: KindConfig
  kind: string
  checklist: ChecklistState
  onChecklistChange: (value: ChecklistState) => void
}

/** Every action button is disabled while any other action is running. */
function usePendingFlags() {
  const confirmOperation = useConfirmOperation()
  const checkAvailability = useCheckAvailability()
  const validate = useValidateOperation()
  const cancel = useCancelOperation()
  const remove = useDeleteOperation()

  const anyPending =
    confirmOperation.isPending ||
    checkAvailability.isPending ||
    validate.isPending ||
    cancel.isPending ||
    remove.isPending

  return { confirmOperation, checkAvailability, validate, cancel, remove, anyPending }
}

export function OperationActions({
  operation,
  config,
  kind,
  checklist,
  onChecklistChange,
}: OperationActionsProps) {
  const navigate = useNavigate()
  const [dialog, setDialog] = useState<PendingDialog>(null)
  const { confirmOperation, checkAvailability, validate, cancel, remove, anyPending } =
    usePendingFlags()

  const showChecklist = config.needsChecklist && operation.status === 'READY'
  const checklistComplete = checklist.picked && checklist.packed
  const validateBlocked = showChecklist && !checklistComplete

  const busy = (own: boolean): boolean => anyPending && !own
  const closeDialog = (): void => {
    if (!anyPending) setDialog(null)
  }

  if (operation.status === 'DONE' || operation.status === 'CANCELED') return null

  return (
    <div className="space-y-4">
      {showChecklist ? (
        <DeliveryChecklist
          value={checklist}
          onChange={onChecklistChange}
          disabled={anyPending}
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {operation.status === 'DRAFT' ? (
          <>
            <Button variant="outline" asChild disabled={anyPending}>
              <Link to={`/operations/${kind}/${operation.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
            <Button
              onClick={() => confirmOperation.mutate(operation.id)}
              disabled={busy(confirmOperation.isPending)}
            >
              {confirmOperation.isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
              Confirm
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDialog('delete')}
              disabled={anyPending}
            >
              <Trash2Icon />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDialog('cancel')} disabled={anyPending}>
              <CircleSlashIcon />
              Cancel
            </Button>
          </>
        ) : null}

        {operation.status === 'WAITING' ? (
          <>
            <Button
              onClick={() => checkAvailability.mutate(operation.id)}
              disabled={busy(checkAvailability.isPending)}
            >
              {checkAvailability.isPending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <PackageSearchIcon />
              )}
              Check availability
            </Button>
            <Button variant="outline" onClick={() => setDialog('cancel')} disabled={anyPending}>
              <CircleSlashIcon />
              Cancel
            </Button>
          </>
        ) : null}

        {operation.status === 'READY' ? (
          <>
            <Button
              onClick={() => setDialog('validate')}
              disabled={anyPending || validateBlocked}
              title={validateBlocked ? 'Tick the packing checklist first' : undefined}
            >
              {validate.isPending ? <LoaderCircleIcon className="animate-spin" /> : <BadgeCheckIcon />}
              Validate
            </Button>
            {config.showsAvailability ? (
              <Button
                variant="outline"
                onClick={() => checkAvailability.mutate(operation.id)}
                disabled={busy(checkAvailability.isPending)}
              >
                {checkAvailability.isPending ? (
                  <LoaderCircleIcon className="animate-spin" />
                ) : (
                  <PackageSearchIcon />
                )}
                Check availability
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog('cancel')} disabled={anyPending}>
              <CircleSlashIcon />
              Cancel
            </Button>
          </>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog === 'validate'}
        onOpenChange={(open) => (open ? setDialog('validate') : closeDialog())}
        title="Validate this operation?"
        description={describeValidationSummary(operation)}
        confirmLabel="Validate"
        loading={validate.isPending}
        onConfirm={() => {
          validate.mutate(operation.id, { onSettled: () => setDialog(null) })
        }}
      />

      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={(open) => (open ? setDialog('delete') : closeDialog())}
        title="Delete this draft?"
        description="The draft and its lines are removed for good. Stock is not affected."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          remove.mutate(operation.id, {
            onSuccess: () => {
              toast.success('Draft deleted.')
              navigate(`/operations/${kind}`, { replace: true })
            },
            onSettled: () => setDialog(null),
          })
        }}
      />

      <ConfirmDialog
        open={dialog === 'cancel'}
        onOpenChange={(open) => (open ? setDialog('cancel') : closeDialog())}
        title="Cancel this operation?"
        description="The operation stays in the list as canceled. Stock is not affected."
        confirmLabel="Cancel operation"
        destructive
        loading={cancel.isPending}
        onConfirm={() => {
          cancel.mutate(operation.id, { onSettled: () => setDialog(null) })
        }}
      />
    </div>
  )
}
