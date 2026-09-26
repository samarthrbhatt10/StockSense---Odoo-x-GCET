import { LocationType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { locationFullName, locationSelect } from "../../lib/format";
import { ok } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import { optionalId, parse } from "../../lib/validate";

const MAX_PRODUCTS = 500;

const productsQuery = z.object({
  search: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined),
});

const locationsQuery = z.object({
  type: z.preprocess((value) => (value === "" ? undefined : value), z.nativeEnum(LocationType).optional()),
  warehouseId: optionalId,
});

const stockQuery = z.object({
  productId: optionalId,
  locationId: optionalId,
  warehouseId: optionalId,
});

const router = Router();

router.get("/products", async (req, res) => {
  const { search } = parse(productsQuery, req.query);
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, sku: true, uom: true, categoryId: true, category: { select: { name: true } } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: MAX_PRODUCTS,
  });
  ok(
    res,
    products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      uom: p.uom,
      categoryId: p.categoryId,
      categoryName: p.category?.name ?? null,
    })),
  );
});

router.get("/locations", async (req, res) => {
  const { type, warehouseId } = parse(locationsQuery, req.query);
  const locations = await prisma.location.findMany({
    where: { isActive: true, type, warehouseId },
    select: locationSelect,
  });
  const sorted = [...locations].sort((a, b) => {
    const aVirtual = a.type === "INTERNAL" ? 0 : 1;
    const bVirtual = b.type === "INTERNAL" ? 0 : 1;
    return (
      aVirtual - bVirtual ||
      (a.warehouse?.code ?? "").localeCompare(b.warehouse?.code ?? "") ||
      a.name.localeCompare(b.name)
    );
  });
  ok(
    res,
    sorted.map((l) => ({
      id: l.id,
      name: l.name,
      fullName: locationFullName(l),
      type: l.type,
      warehouseId: l.warehouseId,
      warehouseCode: l.warehouse?.code ?? null,
    })),
  );
});

router.get("/warehouses", async (_req, res) => {
  const warehouses = await prisma.warehouse.findMany({
    select: { id: true, name: true, code: true },
    orderBy: { code: "asc" },
  });
  ok(res, warehouses);
});

router.get("/categories", async (_req, res) => {
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  ok(res, categories);
});

router.get("/stock", async (req, res) => {
  const { productId, locationId, warehouseId } = parse(stockQuery, req.query);
  const quants = await prisma.stockQuant.findMany({
    where: { productId, locationId, location: { type: "INTERNAL", warehouseId } },
    select: { productId: true, locationId: true, quantity: true },
    orderBy: [{ productId: "asc" }, { locationId: "asc" }],
  });
  ok(res, quants);
});

export default router;
