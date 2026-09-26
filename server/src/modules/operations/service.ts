import type { AuthUser } from "../../lib/auth";
import { AppError, invalidState, list, notFound, ok } from "../../lib/http";
import { locationFullName, locationSelect } from "../../lib/format";
import { getQuantity, getVirtualLocation } from "../../lib/stock";
import { nextReference } from "../../lib/sequence";
import { prisma, type Db } from "../../lib/prisma";
import { toSkipTake, toDateRange } from "../../lib/validate";
import type { listOperationsQuerySchema, createOperationSchema, updateOperationSchema } from "./schemas";
import type { z } from "zod";
import type { OperationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Prisma select fragments
// ---------------------------------------------------------------------------

const lineSelect = {
  id: true,
  productId: true,
  quantity: true,
  countedQuantity: true,
  product: { select: { id: true, name: true, sku: true, uom: true } },
} as const;

const moveSelect = {
  id: true,
  productId: true,
  quantity: true,
  createdAt: true,
  product: { select: { name: true } },
  fromLocation: { select: { id: true, name: true, type: true, warehouse: { select: { id: true, code: true, name: true } } } },
  toLocation: { select: { id: true, name: true, type: true, warehouse: { select: { id: true, code: true, name: true } } } },
} as const;

const summarySelect = {
  id: true,
  reference: true,
  type: true,
  status: true,
  partnerName: true,
  scheduledDate: true,
  doneAt: true,
  sourceLocation: { select: locationSelect },
  destLocation: { select: locationSelect },
  createdBy: { select: { id: true, name: true } },
  lines: { select: { quantity: true } },
} as const;

const detailSelect = {
  ...summarySelect,
  notes: true,
  createdAt: true,
  updatedAt: true,
  lines: { select: lineSelect },
  moves: { select: moveSelect, orderBy: { createdAt: "asc" as const } },
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isLate(scheduledDate: Date, status: string): boolean {
  if (!["DRAFT", "WAITING", "READY"].includes(status)) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return scheduledDate < today;
}

function formatSummary(op: any) {
  const lineCount = op.lines.length;
  const totalQuantity = (op.lines as { quantity: number }[]).reduce((s, l) => s + l.quantity, 0);
  return {
    id: op.id,
    reference: op.reference,
    type: op.type,
    status: op.status,
    partnerName: op.partnerName ?? null,
    scheduledDate: op.scheduledDate,
    doneAt: op.doneAt ?? null,
    isLate: isLate(op.scheduledDate, op.status),
    sourceLocation: { id: op.sourceLocation.id, fullName: locationFullName(op.sourceLocation) },
    destLocation: { id: op.destLocation.id, fullName: locationFullName(op.destLocation) },
    lineCount,
    totalQuantity,
    createdBy: op.createdBy,
  };
}

async function formatDetail(db: Db, op: any) {
  const lines = await Promise.all(
    (op.lines as any[]).map(async (line) => {
      let available: number | null = null;
      if (op.type === "DELIVERY" || op.type === "INTERNAL") {
        available = await getQuantity(db, line.productId, op.sourceLocation.id);
      } else if (op.type === "ADJUSTMENT") {
        if (op.status === "DONE") {
          available = line.quantity; // stored recorded qty
        } else {
          available = await getQuantity(db, line.productId, op.destLocation.id);
        }
      }
      return {
        id: line.id,
        productId: line.productId,
        product: line.product,
        quantity: line.quantity,
        countedQuantity: line.countedQuantity ?? null,
        available,
      };
    }),
  );

  return {
    ...formatSummary(op),
    notes: op.notes ?? null,
    createdAt: op.createdAt,
    updatedAt: op.updatedAt,
    lines,
    moves: (op.moves as any[]).map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      fromName: locationFullName(m.fromLocation),
      toName: locationFullName(m.toLocation),
      quantity: m.quantity,
      createdAt: m.createdAt,
    })),
  };
}

async function fetchDetail(db: Db, id: number) {
  const op = await db.operation.findUnique({ where: { id }, select: detailSelect });
  if (!op) throw notFound("Operation");
  return op;
}

// ---------------------------------------------------------------------------
// Resolve and validate locations for create/update
// ---------------------------------------------------------------------------

async function resolveLocations(
  db: Db,
  type: OperationType,
  input: { sourceLocationId?: number; destLocationId?: number },
) {
  // Determine which side is virtual (set by server) and which is client-supplied INTERNAL

  let sourceLocationId: number;
  let destLocationId: number;

  if (type === "RECEIPT") {
    // source = Vendors (virtual), dest = INTERNAL from client
    if (!input.destLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "destLocationId is required for receipts", {
        fieldErrors: { destLocationId: ["Destination location is required"] },
      });
    }
    const dest = await db.location.findUnique({ where: { id: input.destLocationId } });
    if (!dest || !dest.isActive)
      throw new AppError(400, "VALIDATION_ERROR", "Destination location not found or inactive", {
        fieldErrors: { destLocationId: ["Location not found or inactive"] },
      });
    if (dest.type !== "INTERNAL")
      throw new AppError(400, "VALIDATION_ERROR", "Destination must be an internal location", {
        fieldErrors: { destLocationId: ["Must be an internal location"] },
      });
    const vendor = await getVirtualLocation(db, "VENDOR");
    sourceLocationId = vendor.id;
    destLocationId = dest.id;

  } else if (type === "DELIVERY") {
    // source = INTERNAL from client, dest = Customers (virtual)
    if (!input.sourceLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "sourceLocationId is required for deliveries", {
        fieldErrors: { sourceLocationId: ["Source location is required"] },
      });
    }
    const src = await db.location.findUnique({ where: { id: input.sourceLocationId } });
    if (!src || !src.isActive)
      throw new AppError(400, "VALIDATION_ERROR", "Source location not found or inactive", {
        fieldErrors: { sourceLocationId: ["Location not found or inactive"] },
      });
    if (src.type !== "INTERNAL")
      throw new AppError(400, "VALIDATION_ERROR", "Source must be an internal location", {
        fieldErrors: { sourceLocationId: ["Must be an internal location"] },
      });
    const customer = await getVirtualLocation(db, "CUSTOMER");
    sourceLocationId = src.id;
    destLocationId = customer.id;

  } else if (type === "INTERNAL") {
    if (!input.sourceLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "sourceLocationId is required for internal transfers", {
        fieldErrors: { sourceLocationId: ["Source location is required"] },
      });
    }
    if (!input.destLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "destLocationId is required for internal transfers", {
        fieldErrors: { destLocationId: ["Destination location is required"] },
      });
    }
    if (input.sourceLocationId === input.destLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "Source and destination locations must be different", {
        fieldErrors: { destLocationId: ["Must differ from source location"] },
      });
    }
    const [src, dest] = await Promise.all([
      db.location.findUnique({ where: { id: input.sourceLocationId } }),
      db.location.findUnique({ where: { id: input.destLocationId } }),
    ]);
    if (!src || !src.isActive || src.type !== "INTERNAL")
      throw new AppError(400, "VALIDATION_ERROR", "Source must be an active internal location", {
        fieldErrors: { sourceLocationId: ["Must be an active internal location"] },
      });
    if (!dest || !dest.isActive || dest.type !== "INTERNAL")
      throw new AppError(400, "VALIDATION_ERROR", "Destination must be an active internal location", {
        fieldErrors: { destLocationId: ["Must be an active internal location"] },
      });
    sourceLocationId = src.id;
    destLocationId = dest.id;

  } else {
    // ADJUSTMENT: source = Inventory Adjustment (virtual), dest = INTERNAL counted location
    if (!input.destLocationId) {
      throw new AppError(400, "VALIDATION_ERROR", "destLocationId is required for adjustments", {
        fieldErrors: { destLocationId: ["Counted location is required"] },
      });
    }
    const dest = await db.location.findUnique({ where: { id: input.destLocationId } });
    if (!dest || !dest.isActive || dest.type !== "INTERNAL")
      throw new AppError(400, "VALIDATION_ERROR", "Destination must be an active internal location", {
        fieldErrors: { destLocationId: ["Must be an active internal location"] },
      });
    const adj = await getVirtualLocation(db, "ADJUSTMENT");
    sourceLocationId = adj.id;
    destLocationId = dest.id;
  }

  return { sourceLocationId, destLocationId };
}

// ---------------------------------------------------------------------------
// Validate and build lines for create/update
// ---------------------------------------------------------------------------

async function buildLines(
  db: Db,
  type: OperationType,
  rawLines: z.infer<typeof import("./schemas").operationLineInputSchema>[],
) {
  // Check for duplicate products
  const productIds = rawLines.map((l) => l.productId);
  if (new Set(productIds).size !== productIds.length) {
    throw new AppError(400, "VALIDATION_ERROR", "Each product can appear only once");
  }

  // Validate all products exist and are active
  const products = await db.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, isActive: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return rawLines.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) {
      throw new AppError(400, "VALIDATION_ERROR", `Product ${line.productId} not found`);
    }
    if (!product.isActive) {
      throw new AppError(400, "VALIDATION_ERROR", `Product ${line.productId} is inactive`);
    }

    if (type === "ADJUSTMENT") {
      if (line.countedQuantity === undefined || line.countedQuantity === null) {
        throw new AppError(400, "VALIDATION_ERROR", "countedQuantity is required for adjustments", {
          fieldErrors: { countedQuantity: ["Required for adjustments"] },
        });
      }
      return { productId: line.productId, quantity: 0, countedQuantity: line.countedQuantity };
    } else {
      if (!line.quantity) {
        throw new AppError(400, "VALIDATION_ERROR", "quantity is required", {
          fieldErrors: { quantity: ["Required"] },
        });
      }
      return { productId: line.productId, quantity: line.quantity, countedQuantity: null };
    }
  });
}

// Get warehouse code for the "INTERNAL side" location to generate the reference
async function getWarehouseCode(db: Db, type: OperationType, sourceLocationId: number, destLocationId: number): Promise<string> {
  // For RECEIPT/ADJUSTMENT: use dest warehouse; for DELIVERY/INTERNAL: use source warehouse
  const locationId = (type === "RECEIPT" || type === "ADJUSTMENT") ? destLocationId : sourceLocationId;
  const loc = await db.location.findUnique({
    where: { id: locationId },
    select: { warehouse: { select: { code: true } } },
  });
  if (!loc?.warehouse?.code) {
    throw new AppError(500, "INTERNAL", "Could not resolve warehouse code for reference generation");
  }
  return loc.warehouse.code;
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

export async function listOperations(query: z.infer<typeof import("./schemas").listOperationsQuerySchema>) {
  const { page, pageSize, search, type, status, warehouseId, dateFrom, dateTo } = query;
  const { skip, take } = toSkipTake({ page, pageSize });

  const dateRange = toDateRange(dateFrom, dateTo);
  const where = {
    ...(type ? { type } : {}),
    ...(status && status.length > 0 ? { status: { in: status } } : {}),
    ...(warehouseId
      ? {
          OR: [
            { sourceLocation: { warehouseId } },
            { destLocation: { warehouseId } },
          ],
        }
      : {}),
    ...(dateRange ? { scheduledDate: dateRange } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" as const } },
            { partnerName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [ops, total] = await Promise.all([
    prisma.operation.findMany({
      where,
      select: summarySelect,
      orderBy: [{ scheduledDate: "desc" }, { id: "desc" }],
      skip,
      take,
    }),
    prisma.operation.count({ where }),
  ]);

  return { items: ops.map(formatSummary), meta: { total, page, pageSize } };
}

export async function getOperationDetail(id: number) {
  const op = await fetchDetail(prisma, id);
  return formatDetail(prisma, op);
}

export async function createOperation(
  user: AuthUser,
  input: z.infer<typeof import("./schemas").createOperationSchema>,
) {
  const { type, partnerName, scheduledDate, notes, lines: rawLines } = input;

  const { sourceLocationId, destLocationId } = await resolveLocations(prisma, type, input);
  const lines = await buildLines(prisma, type, rawLines);
  const warehouseCode = await getWarehouseCode(prisma, type, sourceLocationId, destLocationId);

  const op = await prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, type, warehouseCode);
    return tx.operation.create({
      data: {
        reference,
        type,
        status: "DRAFT",
        sourceLocationId,
        destLocationId,
        partnerName: partnerName ?? null,
        scheduledDate: scheduledDate ?? new Date(),
        notes: notes ?? null,
        createdById: user.id,
        lines: { create: lines },
      },
      select: detailSelect,
    });
  });

  return formatDetail(prisma, op);
}

export async function updateOperation(
  user: AuthUser,
  id: number,
  input: z.infer<typeof import("./schemas").updateOperationSchema>,
) {
  const existing = await prisma.operation.findUnique({
    where: { id },
    select: { status: true, type: true },
  });
  if (!existing) throw notFound("Operation");
  if (existing.status !== "DRAFT") throw invalidState("Only draft operations can be edited");

  const type = input.type ?? existing.type;
  if (input.type && input.type !== existing.type) {
    throw new AppError(400, "VALIDATION_ERROR", "Operation type cannot be changed", {
      fieldErrors: { type: ["Cannot be changed after creation"] },
    });
  }

  const { sourceLocationId, destLocationId } = await resolveLocations(prisma, type, input);
  const lines = await buildLines(prisma, type, input.lines);

  const op = await prisma.$transaction(async (tx) => {
    await tx.operationLine.deleteMany({ where: { operationId: id } });
    return tx.operation.update({
      where: { id },
      data: {
        sourceLocationId,
        destLocationId,
        partnerName: input.partnerName ?? null,
        scheduledDate: input.scheduledDate,
        notes: input.notes ?? null,
        lines: { create: lines },
      },
      select: detailSelect,
    });
  });

  return formatDetail(prisma, op);
}

export async function deleteOperation(id: number) {
  const existing = await prisma.operation.findUnique({ where: { id }, select: { status: true } });
  if (!existing) throw notFound("Operation");
  if (existing.status !== "DRAFT") throw invalidState("Only draft operations can be deleted");

  await prisma.operation.delete({ where: { id } });
  return { id };
}
