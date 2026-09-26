import type { OperationStatus, OperationType } from "@prisma/client";
import { prisma } from "../../lib/prisma";

const MAX_RESULTS = 6;

export type SearchProduct = { id: number; name: string; sku: string; uom: string };
export type SearchOperation = {
  id: number;
  reference: string;
  type: OperationType;
  status: OperationStatus;
  partnerName: string | null;
};

const productSelect = { id: true, name: true, sku: true, uom: true } as const;

async function searchProducts(q: string): Promise<SearchProduct[]> {
  const contains = { contains: q, mode: "insensitive" as const };
  const [exact, matches] = await Promise.all([
    prisma.product.findFirst({
      where: { isActive: true, sku: { equals: q, mode: "insensitive" } },
      select: productSelect,
    }),
    prisma.product.findMany({
      where: { isActive: true, OR: [{ name: contains }, { sku: contains }] },
      select: productSelect,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: MAX_RESULTS,
    }),
  ]);
  if (!exact) return matches;
  return [exact, ...matches.filter((product) => product.id !== exact.id)].slice(0, MAX_RESULTS);
}

function searchOperations(q: string): Promise<SearchOperation[]> {
  const contains = { contains: q, mode: "insensitive" as const };
  return prisma.operation.findMany({
    where: { OR: [{ reference: contains }, { partnerName: contains }] },
    select: { id: true, reference: true, type: true, status: true, partnerName: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MAX_RESULTS,
  });
}

export async function search(q: string): Promise<{ products: SearchProduct[]; operations: SearchOperation[] }> {
  const [products, operations] = await Promise.all([searchProducts(q), searchOperations(q)]);
  return { products, operations };
}
