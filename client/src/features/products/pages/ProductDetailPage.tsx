import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  ArrowDownToLineIcon,
  ClipboardCheckIcon,
  EyeIcon,
  EyeOffIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  TruckIcon,
} from 'lucide-react'
import { useAuth } from '@/app/AuthProvider'
import { useLookupWarehouses } from '@/lib/lookups'
import { formatDateTime, formatQty } from '@/lib/format'
import { TYPE_TO_KIND, type OperationType } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  PageHeader,
  StockStatusBadge,
} from '@/components/common'
import { ReorderRuleDialog } from '../components/ReorderRuleDialog'
import {
  useDeleteProduct,
  useDeleteReorderRule,
  useProduct,
  useToggleProductActive,
} from '../hooks'
import type { ProductReorderRule, ProductRecentMove } from '../types'

/** +1 stock arrived, -1 stock left, 0 an internal transfer that nets out. */
function directionOf(move: ProductRecentMove): 1 | -1 | 0 {
  if (move.type === 'RECEIPT') return 1
  if (move.type === 'DELIVERY') return -1
  if (move.type === 'INTERNAL') return 0
  return move.fromName === 'Inventory Adjustment' ? 1 : -1
}

export default function ProductDetailPage() {
  const { id } = useParams()
  const productId = Number(id)
  const { isManager } = useAuth()

  const { data: product, isPending, isError, error, refetch } = useProduct(productId)
  const warehouses = useLookupWarehouses()
  const setActive = useToggleProductActive()
  const deleteProduct = useDeleteProduct()
  const deleteRule = useDeleteReorderRule()

  const [ruleDialogOpen, setRuleDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ProductReorderRule | undefined>(undefined)
  const [deletingRule, setDeletingRule] = useState<ProductReorderRule | undefined>(undefined)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product" description="Loading…" backTo="/products" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Product" backTo="/products" />
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    )
  }

  if (!product) return null

  const rules = product.reorderRules
  // The picker must not offer a warehouse that already has a rule for this product.
  const warehousesWithoutRule = (warehouses.data ?? []).filter(
    (warehouse) => !rules.some((rule) => rule.warehouseId === warehouse.id),
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.uom} · created ${formatDateTime(product.createdAt)}`}
        backTo="/products"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to={`/products/${product.id}/edit`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
            {isManager ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={setActive.isPending}
                  onClick={() => setActive.mutate({ id: product.id, isActive: !product.isActive })}
                >
                  {product.isActive ? <EyeOffIcon /> : <EyeIcon />}
                  {product.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-destructive hover:bg-destructive/10"
                >
                  <Trash2Icon />
                  Delete
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {/* Quick actions get their own row: too many for the header at 375px. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Quick actions
        </span>
        <Button asChild variant="outline" size="sm">
          <Link to={`/operations/receipts/new?productId=${product.id}`}>
            <ArrowDownToLineIcon />
            Receive
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/operations/deliveries/new?productId=${product.id}`}>
            <TruckIcon />
            Deliver
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/operations/adjustments/new?productId=${product.id}`}>
            <ClipboardCheckIcon />
            Count stock
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs">
          {product.sku}
        </Badge>
        <StockStatusBadge status={product.status} />
        {product.category ? (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            {product.category.name}
          </Badge>
        ) : null}
        {product.isActive ? null : (
          <Badge variant="outline" className="bg-muted text-muted-foreground">
            Inactive
          </Badge>
        )}
      </div>

      {/* The total spans both columns on phones so the page is not three screens tall. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="col-span-2 sm:col-span-1">
          <CardHeader>
            <CardDescription>Total on hand</CardDescription>
            <CardTitle className="text-2xl">{formatQty(product.onHand, product.uom)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Locations holding stock</CardDescription>
            <CardTitle className="text-2xl">{product.stockByLocation.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Reorder rules</CardDescription>
            <CardTitle className="text-2xl">{product.reorderRules.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock by location</CardTitle>
          <CardDescription>Only locations that currently hold this product.</CardDescription>
        </CardHeader>
        <CardContent>
          {product.stockByLocation.length === 0 ? (
            <EmptyState title="No stock yet" description="This product is not in any location." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Location</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.stockByLocation.map((row) => (
                    <TableRow key={row.locationId}>
                      <TableCell className="font-medium text-foreground">{row.fullName}</TableCell>
                      <TableCell>{row.warehouseCode ?? '—'}</TableCell>
                      <TableCell className="text-right">{formatQty(row.quantity, product.uom)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Reordering rules</CardTitle>
            <CardDescription>Per-warehouse minimums that drive the low stock status.</CardDescription>
          </div>
          {isManager ? (
            <Button
              size="sm"
              onClick={() => {
                setEditingRule(undefined)
                setRuleDialogOpen(true)
              }}
              disabled={warehousesWithoutRule.length === 0}
            >
              <PlusIcon />
              Add rule
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <EmptyState
              title="No reorder rules"
              description="Without a rule this product is only ever in stock or out of stock."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Warehouse</TableHead>
                    <TableHead className="text-right">Min</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">On hand</TableHead>
                    <TableHead>Status</TableHead>
                    {isManager ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <span className="font-medium text-foreground">{rule.warehouseCode}</span>{' '}
                        <span className="text-muted-foreground">{rule.warehouseName}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatQty(rule.minQty)}</TableCell>
                      <TableCell className="text-right">{formatQty(rule.maxQty)}</TableCell>
                      <TableCell className="text-right">
                        {formatQty(rule.onHand, product.uom)}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={rule.status} />
                      </TableCell>
                      {isManager ? (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setEditingRule(rule)
                                setRuleDialogOpen(true)
                              }}
                              aria-label={`Edit rule for ${rule.warehouseCode}`}
                            >
                              <PencilIcon />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingRule(rule)}
                              aria-label={`Delete rule for ${rule.warehouseCode}`}
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2Icon />
                            </Button>
                          </div>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="text-base">Recent movements</CardTitle>
            <CardDescription>The last {product.recentMoves.length} ledger entries.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/moves?productId=${product.id}`}>View full history</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {product.recentMoves.length === 0 ? (
            <EmptyState title="No movements yet" description="Nothing has moved for this product." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.recentMoves.map((move) => {
                    const direction = directionOf(move)
                    const kind: OperationType = move.type
                    return (
                      <TableRow key={move.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(move.createdAt)}
                        </TableCell>
                        <TableCell>
                          {move.operationId ? (
                            <Link
                              to={`/operations/${TYPE_TO_KIND[kind]}/${move.operationId}`}
                              className="font-mono text-xs font-medium text-primary hover:underline"
                            >
                              {move.reference}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs text-muted-foreground">
                              {move.reference}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{move.fromName}</TableCell>
                        <TableCell>{move.toName}</TableCell>
                        <TableCell
                          className={
                            direction > 0
                              ? 'text-right font-medium text-emerald-600'
                              : direction < 0
                                ? 'text-right font-medium text-destructive'
                                : 'text-right text-muted-foreground'
                          }
                        >
                          {direction > 0 ? '+' : direction < 0 ? '−' : ''}
                          {formatQty(move.quantity, product.uom)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReorderRuleDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
        productId={product.id}
        warehouses={editingRule ? (warehouses.data ?? []) : warehousesWithoutRule}
        rule={editingRule}
      />

      <ConfirmDialog
        open={Boolean(deletingRule)}
        onOpenChange={(open) => {
          if (!open) setDeletingRule(undefined)
        }}
        title={`Delete the reorder rule for ${deletingRule?.warehouseCode ?? ''}?`}
        description="The product will stop being flagged as low stock in that warehouse."
        confirmLabel="Delete rule"
        destructive
        loading={deleteRule.isPending}
        onConfirm={() => {
          if (!deletingRule) return
          deleteRule.mutate(deletingRule.id, {
            onSuccess: () => setDeletingRule(undefined),
          })
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${product.name}?`}
        description="Only products without stock history can be deleted. This cannot be undone."
        confirmLabel="Delete product"
        destructive
        loading={deleteProduct.isPending}
        onConfirm={() => {
          deleteProduct.mutate(product.id, {
            onSuccess: () => setConfirmDelete(false),
          })
        }}
      />
    </div>
  )
}
