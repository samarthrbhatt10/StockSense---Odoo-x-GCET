import type { AuthUser } from "../../lib/auth";
import { invalidState, notFound } from "../../lib/http";
import { applyMoves, getQuantity, getVirtualLocation } from "../../lib/stock";
import { prisma } from "../../lib/prisma";
import { getOperationDetail } from "./service";

// ---------------------------------------------------------------------------
// Availability helper
// ---------------------------------------------------------------------------

async function isAvailable(sourceLocationId: number, lines: { productId: number; quantity: number }[]): Promise<boolean> {
  // Sum per product (defensive — unique index prevents duplicates but we're safe)
  const totals = new Map<number, number>();
  for (const line of lines) {
    totals.set(line.productId, (totals.get(line.productId) ?? 0) + line.quantity);
  }

  for (const [productId, needed] of totals) {
    const available = await getQuantity(prisma, productId, sourceLocationId);
    if (available < needed) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// confirm
// ---------------------------------------------------------------------------

export async function confirmOperation(user: AuthUser, id: number) {
  const op = await prisma.operation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      type: true,
      sourceLocationId: true,
      lines: { select: { productId: true, quantity: true } },
    },
  });
  if (!op) throw notFound("Operation");
  if (op.status !== "DRAFT") throw invalidState("Only draft operations can be confirmed");

  let newStatus: "READY" | "WAITING" = "READY";

  // DELIVERY and INTERNAL must check stock at source
  if (op.type === "DELIVERY" || op.type === "INTERNAL") {
    const available = await isAvailable(op.sourceLocationId, op.lines);
    newStatus = available ? "READY" : "WAITING";
  }

  await prisma.operation.update({ where: { id }, data: { status: newStatus } });
  return getOperationDetail(id);
}

// ---------------------------------------------------------------------------
// check-availability
// ---------------------------------------------------------------------------

export async function checkAvailabilityOperation(user: AuthUser, id: number) {
  const op = await prisma.operation.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      type: true,
      sourceLocationId: true,
      lines: { select: { productId: true, quantity: true } },
    },
  });
  if (!op) throw notFound("Operation");
  if (op.status !== "WAITING" && op.status !== "READY") {
    throw invalidState("Check availability is only valid for waiting or ready operations");
  }

  // RECEIPT and ADJUSTMENT are unconditionally READY (no source stock consumed)
  let newStatus: "READY" | "WAITING" = "READY";
  if (op.type === "DELIVERY" || op.type === "INTERNAL") {
    const available = await isAvailable(op.sourceLocationId, op.lines);
    newStatus = available ? "READY" : "WAITING";
  }

  await prisma.operation.update({ where: { id }, data: { status: newStatus } });
  return getOperationDetail(id);
}

// ---------------------------------------------------------------------------
// validate
// ---------------------------------------------------------------------------

export async function validateOperation(user: AuthUser, id: number) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Step 1: atomic claim — prevents double-validate
    const claimed = await tx.operation.updateMany({
      where: { id, status: "READY" },
      data: { status: "DONE", doneAt: now },
    });
    if (claimed.count === 0) {
      throw invalidState("Only ready operations can be validated");
    }

    // Load the full operation inside the transaction
    const op = await tx.operation.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        reference: true,
        sourceLocationId: true,
        destLocationId: true,
        lines: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            countedQuantity: true,
          },
        },
      },
    });
    if (!op) throw notFound("Operation");

    // Step 2: build moves per CONTRACT §4
    type MoveInput = { productId: number; fromLocationId: number; toLocationId: number; quantity: number };
    const moves: MoveInput[] = [];

    if (op.type === "RECEIPT") {
      for (const line of op.lines) {
        moves.push({
          productId: line.productId,
          fromLocationId: op.sourceLocationId,
          toLocationId: op.destLocationId,
          quantity: line.quantity,
        });
      }
    } else if (op.type === "DELIVERY") {
      for (const line of op.lines) {
        moves.push({
          productId: line.productId,
          fromLocationId: op.sourceLocationId,
          toLocationId: op.destLocationId,
          quantity: line.quantity,
        });
      }
    } else if (op.type === "INTERNAL") {
      for (const line of op.lines) {
        moves.push({
          productId: line.productId,
          fromLocationId: op.sourceLocationId,
          toLocationId: op.destLocationId,
          quantity: line.quantity,
        });
      }
    } else {
      // ADJUSTMENT
      const adjLocation = await getVirtualLocation(tx, "ADJUSTMENT");

      for (const line of op.lines) {
        // Record the current system quantity as this line's "recorded" qty
        const recorded = await getQuantity(tx, line.productId, op.destLocationId);
        const roundedRecorded = Math.round(recorded * 1000) / 1000;

        // Persist recorded quantity on the line
        await tx.operationLine.update({
          where: { id: line.id },
          data: { quantity: roundedRecorded },
        });

        const counted = line.countedQuantity ?? 0;
        const diff = Math.round((counted - roundedRecorded) * 1000) / 1000;

        if (diff > 0) {
          // Inventory Adjustment → location (stock increase)
          moves.push({
            productId: line.productId,
            fromLocationId: adjLocation.id,
            toLocationId: op.destLocationId,
            quantity: diff,
          });
        } else if (diff < 0) {
          // location → Inventory Adjustment (stock decrease)
          moves.push({
            productId: line.productId,
            fromLocationId: op.destLocationId,
            toLocationId: adjLocation.id,
            quantity: -diff,
          });
        }
        // diff === 0 → no move
      }
    }

    // Step 3: apply all moves (throws INSUFFICIENT_STOCK → rolls back everything incl. step 1)
    if (moves.length > 0) {
      await applyMoves(tx, moves, {
        type: op.type,
        reference: op.reference,
        userId: user.id,
        operationId: op.id,
        at: now,
      });
    }
  });

  return getOperationDetail(id);
}

// ---------------------------------------------------------------------------
// cancel
// ---------------------------------------------------------------------------

export async function cancelOperation(user: AuthUser, id: number) {
  const op = await prisma.operation.findUnique({ where: { id }, select: { status: true } });
  if (!op) throw notFound("Operation");

  if (op.status === "DONE") throw invalidState("Cannot cancel a completed operation");
  if (op.status === "CANCELED") throw invalidState("Cannot cancel an already canceled operation");

  await prisma.operation.update({ where: { id }, data: { status: "CANCELED" } });
  return getOperationDetail(id);
}
