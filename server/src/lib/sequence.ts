import type { OperationType, Prisma } from "@prisma/client";

export const REFERENCE_PREFIX: Record<OperationType, string> = {
  RECEIPT: "IN",
  DELIVERY: "OUT",
  INTERNAL: "INT",
  ADJUSTMENT: "ADJ",
};

export async function nextReference(
  tx: Prisma.TransactionClient,
  type: OperationType,
  warehouseCode: string,
): Promise<string> {
  const key = `${warehouseCode}/${REFERENCE_PREFIX[type]}`;
  const row = await tx.sequence.upsert({
    where: { key },
    create: { key, next: 2 },
    update: { next: { increment: 1 } },
  });
  return `${key}/${String(row.next - 1).padStart(4, "0")}`;
}
