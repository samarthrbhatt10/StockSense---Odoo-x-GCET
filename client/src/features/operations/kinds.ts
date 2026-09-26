import { OPERATION_LABELS, isOperationKind, type OperationKind, type OperationType } from '@/lib/types'

/**
 * Everything that differs between the four kinds of operation lives here, so the
 * list, form and detail pages stay generic (one page set, one config per kind).
 */
export interface KindConfig {
  /** Operation type sent to `POST /api/operations`. */
  type: OperationType
  /** Document names, straight from the shared contract. */
  labels: { singular: string; plural: string }
  /** One line shown under the page title. */
  description: string
  /** Label of the partner field, or null when the document has no partner. */
  partnerLabel: 'Supplier' | 'Customer' | null
  /** The user picks the INTERNAL source location. */
  needsSource: boolean
  /** The user picks the INTERNAL destination location. */
  needsDest: boolean
  /** One real location only: adjustments count a single location. */
  singleLocation: boolean
  /** Show what is on hand at the source next to every line. */
  showsAvailability: boolean
  /** Pick → pack → validate checklist, UI only. */
  needsChecklist: boolean
  sourceLabel: string
  destLabel: string
  /** Copy for the list's empty state. */
  emptyTitle: string
  emptyDescription: string
}

export const KIND_CONFIGS: Record<OperationKind, KindConfig> = {
  receipts: {
    type: 'RECEIPT',
    labels: OPERATION_LABELS.RECEIPT,
    description: 'Incoming stock from vendors',
    partnerLabel: 'Supplier',
    needsSource: false,
    needsDest: true,
    singleLocation: false,
    showsAvailability: false,
    needsChecklist: false,
    sourceLabel: 'From',
    destLabel: 'Destination',
    emptyTitle: 'No receipts yet',
    emptyDescription: 'A receipt brings stock in from a vendor. Create one to record the delivery.',
  },
  deliveries: {
    type: 'DELIVERY',
    labels: OPERATION_LABELS.DELIVERY,
    description: 'Outgoing stock to customers',
    partnerLabel: 'Customer',
    needsSource: true,
    needsDest: false,
    singleLocation: false,
    showsAvailability: true,
    needsChecklist: true,
    sourceLabel: 'Source',
    destLabel: 'Destination',
    emptyTitle: 'No delivery orders yet',
    emptyDescription: 'A delivery order sends stock out to a customer. Create one to start picking.',
  },
  transfers: {
    type: 'INTERNAL',
    labels: OPERATION_LABELS.INTERNAL,
    description: 'Move stock between internal locations',
    partnerLabel: null,
    needsSource: true,
    needsDest: true,
    singleLocation: false,
    showsAvailability: true,
    needsChecklist: false,
    sourceLabel: 'From',
    destLabel: 'To',
    emptyTitle: 'No internal transfers yet',
    emptyDescription: 'A transfer moves stock from one internal location to another. Create one to start.',
  },
  adjustments: {
    type: 'ADJUSTMENT',
    labels: OPERATION_LABELS.ADJUSTMENT,
    description: 'Reconcile a physical count with system stock',
    partnerLabel: null,
    needsSource: false,
    needsDest: true,
    singleLocation: true,
    showsAvailability: false,
    needsChecklist: false,
    sourceLabel: 'From',
    destLabel: 'Counted location',
    emptyTitle: 'No inventory adjustments yet',
    emptyDescription: 'An adjustment fixes the difference between what a count says and what the system holds.',
  },
}

/** Resolves the `:kind` route param, or null when it is not one of the four kinds. */
export function resolveKind(kind: string | undefined): { kind: OperationKind; config: KindConfig } | null {
  if (!kind || !isOperationKind(kind)) return null
  return { kind, config: KIND_CONFIGS[kind] }
}
