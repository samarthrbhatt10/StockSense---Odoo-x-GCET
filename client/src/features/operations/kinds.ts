import type { OperationKind, OperationType } from '@/lib/types'

export interface KindConfig {
  type: OperationType
  singular: string
  plural: string
  description: string
  /** Label for the partner field, or null if no partner */
  partnerLabel: 'Supplier' | 'Customer' | null
  /** User must select a source INTERNAL location */
  needsSource: boolean
  /** User must select a destination INTERNAL location */
  needsDest: boolean
  /** Show live stock availability at source on lines */
  showsAvailability: boolean
}

export const KIND_CONFIGS: Record<OperationKind, KindConfig> = {
  receipts: {
    type: 'RECEIPT',
    singular: 'Receipt',
    plural: 'Receipts',
    description: 'Incoming stock from vendors',
    partnerLabel: 'Supplier',
    needsSource: false,
    needsDest: true,
    showsAvailability: false,
  },
  deliveries: {
    type: 'DELIVERY',
    singular: 'Delivery Order',
    plural: 'Delivery Orders',
    description: 'Outgoing stock to customers',
    partnerLabel: 'Customer',
    needsSource: true,
    needsDest: false,
    showsAvailability: true,
  },
  transfers: {
    type: 'INTERNAL',
    singular: 'Internal Transfer',
    plural: 'Internal Transfers',
    description: 'Move stock between locations',
    partnerLabel: null,
    needsSource: true,
    needsDest: true,
    showsAvailability: true,
  },
  adjustments: {
    type: 'ADJUSTMENT',
    singular: 'Inventory Adjustment',
    plural: 'Inventory Adjustments',
    description: 'Reconcile physical vs system stock',
    partnerLabel: null,
    needsSource: false,
    needsDest: true,
    showsAvailability: false,
  },
}
