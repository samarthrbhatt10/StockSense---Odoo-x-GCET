import { Prisma } from "@prisma/client";
import { AppError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import type { CategoryInput } from "./schemas";

const NAME_TAKEN = "A category with this name already exists";

export type CategoryListItem = { id: number; name: string; productCount: number };

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function listCategories(): Promise<CategoryListItem[]> {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    productCount: category._count.products,
  }));
}

export async function createCategory(input: CategoryInput): Promise<CategoryListItem> {
  try {
    const created = await prisma.category.create({
      data: { name: input.name },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    return { id: created.id, name: created.name, productCount: created._count.products };
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", NAME_TAKEN);
    throw err;
  }
}

export async function updateCategory(
  id: number,
  input: CategoryInput,
): Promise<CategoryListItem> {
  try {
    const updated = await prisma.category.update({
      where: { id },
      data: { name: input.name },
      select: { id: true, name: true, _count: { select: { products: true } } },
    });
    return { id: updated.id, name: updated.name, productCount: updated._count.products };
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(409, "CONFLICT", NAME_TAKEN);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      throw notFound("Category");
    }
    throw err;
  }
}

/** Products keep existing; the schema turns their category into null. */
export async function deleteCategory(id: number): Promise<void> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw notFound("Category");
  await prisma.category.delete({ where: { id } });
}
