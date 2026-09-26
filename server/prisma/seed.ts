import type { OperationStatus, OperationType } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { prisma } from "../src/lib/prisma";
import { nextReference } from "../src/lib/sequence";
import { applyMoves, getQuantity, getStockSummary, type MoveInput } from "../src/lib/stock";

const DAY_MS = 24 * 60 * 60 * 1000;
const EPSILON = 1e-6;

const DEMO_USERS = [
  { name: "Alex Manager", email: "manager@stocksense.local", password: "Manager@123", role: "MANAGER" },
  { name: "Sam Staff", email: "staff@stocksense.local", password: "Staff@123", role: "STAFF" },
] as const;

const WAREHOUSES = [
  { name: "Main Warehouse", code: "WH", address: "12 Industrial Estate, Ahmedabad", locations: ["Stock", "Rack A", "Rack B", "Production Floor"] },
  { name: "Secondary Warehouse", code: "WH2", address: "48 Logistics Park, Gandhinagar", locations: ["Stock"] },
];

const VIRTUAL_LOCATIONS = [
  { name: "Vendors", type: "VENDOR" },
  { name: "Customers", type: "CUSTOMER" },
  { name: "Inventory Adjustment", type: "ADJUSTMENT" },
] as const;

const CATEGORIES = ["Raw Materials", "Furniture", "Office Supplies", "Electronics"];

const PRODUCTS = [
  { sku: "STL-KG", name: "Steel", uom: "kg", category: "Raw Materials" },
  { sku: "STL-ROD", name: "Steel Rods", uom: "Units", category: "Raw Materials" },
  { sku: "ALU-SHEET", name: "Aluminium Sheet", uom: "Units", category: "Raw Materials" },
  { sku: "COP-WIRE", name: "Copper Wire", uom: "m", category: "Raw Materials" },
  { sku: "PLY-BOARD", name: "Plywood Board", uom: "Units", category: "Raw Materials" },
  { sku: "FUR-CHAIR", name: "Office Chair", uom: "Units", category: "Furniture" },
  { sku: "FUR-DESK", name: "Standing Desk", uom: "Units", category: "Furniture" },
  { sku: "FUR-SHELF", name: "Storage Shelf", uom: "Units", category: "Furniture" },
  { sku: "OFF-PAPER", name: "A4 Paper Ream", uom: "Units", category: "Office Supplies" },
  { sku: "OFF-PEN", name: "Ballpoint Pen Box", uom: "Units", category: "Office Supplies" },
  { sku: "OFF-STAPLER", name: "Stapler", uom: "Units", category: "Office Supplies" },
  { sku: "OFF-FAX", name: "Fax Machine", uom: "Units", category: "Office Supplies", isActive: false },
  { sku: "ELC-MON", name: "24in Monitor", uom: "Units", category: "Electronics" },
  { sku: "ELC-KBD", name: "Wireless Keyboard", uom: "Units", category: "Electronics" },
  { sku: "ELC-CABLE", name: "USB-C Cable", uom: "Units", category: "Electronics" },
];

const REORDER_RULES = [
  { sku: "STL-KG", warehouse: "WH", minQty: 50, maxQty: 200 },
  { sku: "STL-ROD", warehouse: "WH", minQty: 40, maxQty: 150 },
  { sku: "FUR-CHAIR", warehouse: "WH", minQty: 10, maxQty: 50 },
  { sku: "OFF-PAPER", warehouse: "WH", minQty: 20, maxQty: 100 },
  { sku: "ELC-MON", warehouse: "WH", minQty: 5, maxQty: 30 },
  { sku: "COP-WIRE", warehouse: "WH2", minQty: 100, maxQty: 500 },
  { sku: "OFF-PEN", warehouse: "WH2", minQty: 10, maxQty: 60 },
];

type LineSpec = { sku: string; quantity?: number; counted?: number };

type OperationSpec = {
  type: OperationType;
  status: OperationStatus;
  from: string;
  to: string;
  lines: LineSpec[];
  /** Days relative to today: negative = past. DONE operations are done on that day. */
  day: number;
  by: "manager" | "staff";
  partner?: string;
  notes?: string;
};

// Listed in chronological order so stock never goes negative along the timeline.
const OPERATIONS: OperationSpec[] = [
  // The problem statement's flow for Steel: +100, move 100, −20, count 77 (−3) → 77 kg.
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH/Stock", day: -14, by: "manager", partner: "Tata Steel Ltd", lines: [{ sku: "STL-KG", quantity: 100 }] },
  { type: "INTERNAL", status: "DONE", from: "WH/Stock", to: "WH/Production Floor", day: -13, by: "staff", lines: [{ sku: "STL-KG", quantity: 100 }] },
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH/Rack B", day: -12, by: "staff", partner: "Ergo Furnishings", lines: [{ sku: "FUR-CHAIR", quantity: 30 }, { sku: "FUR-DESK", quantity: 12 }, { sku: "FUR-SHELF", quantity: 15 }] },
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH/Rack A", day: -11, by: "manager", partner: "Metal Supply Co", lines: [{ sku: "STL-ROD", quantity: 120 }, { sku: "ALU-SHEET", quantity: 80 }] },
  { type: "DELIVERY", status: "DONE", from: "WH/Production Floor", to: "Customers", day: -10, by: "staff", partner: "Acme Constructions", lines: [{ sku: "STL-KG", quantity: 20 }] },
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH/Stock", day: -9, by: "staff", partner: "Paper World", lines: [{ sku: "OFF-PAPER", quantity: 60 }, { sku: "OFF-STAPLER", quantity: 25 }, { sku: "OFF-PEN", quantity: 40 }] },
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH2/Stock", day: -8, by: "manager", partner: "Cable & Wire Inc", lines: [{ sku: "COP-WIRE", quantity: 300 }, { sku: "OFF-PEN", quantity: 50 }, { sku: "ELC-CABLE", quantity: 200 }] },
  { type: "ADJUSTMENT", status: "DONE", from: "Inventory Adjustment", to: "WH/Production Floor", day: -7, by: "manager", notes: "Cycle count: 3 kg lost as scrap", lines: [{ sku: "STL-KG", counted: 77 }] },
  { type: "DELIVERY", status: "DONE", from: "WH/Rack A", to: "Customers", day: -6, by: "staff", partner: "BuildRight Infra", lines: [{ sku: "STL-ROD", quantity: 95 }] },
  { type: "RECEIPT", status: "DONE", from: "Vendors", to: "WH/Stock", day: -5, by: "staff", partner: "Display Tech", lines: [{ sku: "ELC-MON", quantity: 20 }, { sku: "PLY-BOARD", quantity: 40 }] },
  { type: "DELIVERY", status: "DONE", from: "WH/Rack B", to: "Customers", day: -4, by: "staff", partner: "Northwind Offices", lines: [{ sku: "FUR-CHAIR", quantity: 24 }, { sku: "FUR-DESK", quantity: 4 }] },
  { type: "DELIVERY", status: "DONE", from: "WH/Stock", to: "Customers", day: -3, by: "manager", partner: "City Public School", lines: [{ sku: "OFF-PAPER", quantity: 60 }] },
  { type: "DELIVERY", status: "DONE", from: "WH2/Stock", to: "Customers", day: -2, by: "staff", partner: "Metro Electricals", lines: [{ sku: "COP-WIRE", quantity: 120 }] },
  { type: "INTERNAL", status: "DONE", from: "WH/Rack B", to: "WH2/Stock", day: -1, by: "staff", lines: [{ sku: "FUR-SHELF", quantity: 5 }] },

  // Pending and canceled operations.
  { type: "RECEIPT", status: "CANCELED", from: "Vendors", to: "WH/Stock", day: -6, by: "manager", partner: "Display Tech", notes: "Supplier could not deliver", lines: [{ sku: "ELC-KBD", quantity: 10 }] },
  { type: "RECEIPT", status: "READY", from: "Vendors", to: "WH/Stock", day: -2, by: "staff", partner: "Paper World", notes: "Restock after the school order", lines: [{ sku: "OFF-PAPER", quantity: 100 }] },
  { type: "RECEIPT", status: "DRAFT", from: "Vendors", to: "WH/Stock", day: 3, by: "manager", partner: "Tata Steel Ltd", lines: [{ sku: "STL-KG", quantity: 50 }] },
  { type: "DELIVERY", status: "WAITING", from: "WH/Rack B", to: "Customers", day: -1, by: "staff", partner: "Northwind Offices", lines: [{ sku: "FUR-CHAIR", quantity: 15 }] },
  { type: "DELIVERY", status: "READY", from: "WH/Rack A", to: "Customers", day: 0, by: "staff", partner: "BuildRight Infra", lines: [{ sku: "STL-ROD", quantity: 10 }] },
  { type: "DELIVERY", status: "DRAFT", from: "WH/Production Floor", to: "Customers", day: 2, by: "manager", partner: "Acme Constructions", lines: [{ sku: "STL-KG", quantity: 30 }] },
  { type: "INTERNAL", status: "READY", from: "WH/Rack A", to: "WH/Production Floor", day: 1, by: "staff", lines: [{ sku: "ALU-SHEET", quantity: 20 }] },
  { type: "ADJUSTMENT", status: "DRAFT", from: "Inventory Adjustment", to: "WH2/Stock", day: 0, by: "staff", notes: "Monthly count", lines: [{ sku: "OFF-PEN", counted: 48 }] },
];

type SeedLocation = { id: number; type: string; warehouseCode: string | null };

type SeedRefs = {
  users: Record<OperationSpec["by"], number>;
  locations: Map<string, SeedLocation>;
  productIds: Map<string, number>;
};

function dayAt(day: number, hour: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + day);
  date.setHours(hour, 0, 0, 0);
  return date;
}

function required<T>(map: Map<string, T>, key: string, what: string): T {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Seed data error: unknown ${what} "${key}"`);
  return value;
}

async function assertEmptyDatabase(): Promise<void> {
  if ((await prisma.user.count()) > 0) {
    throw new Error("The database already has data. Run `npm run db:setup` to reset and reseed it.");
  }
}

async function seedMasterData(): Promise<SeedRefs> {
  const [manager, staff] = await Promise.all(
    DEMO_USERS.map(async (u) =>
      prisma.user.create({
        data: { name: u.name, email: u.email, role: u.role, passwordHash: await hashPassword(u.password) },
      }),
    ),
  );

  const locations = new Map<string, SeedLocation>();
  const warehouseIds = new Map<string, number>();
  for (const w of WAREHOUSES) {
    const warehouse = await prisma.warehouse.create({
      data: { name: w.name, code: w.code, address: w.address, locations: { create: w.locations.map((name) => ({ name })) } },
      include: { locations: true },
    });
    warehouseIds.set(w.code, warehouse.id);
    for (const l of warehouse.locations) {
      locations.set(`${w.code}/${l.name}`, { id: l.id, type: l.type, warehouseCode: w.code });
    }
  }
  for (const v of VIRTUAL_LOCATIONS) {
    const location = await prisma.location.create({ data: { name: v.name, type: v.type } });
    locations.set(v.name, { id: location.id, type: location.type, warehouseCode: null });
  }

  const categoryIds = new Map<string, number>();
  for (const name of CATEGORIES) {
    categoryIds.set(name, (await prisma.category.create({ data: { name } })).id);
  }

  const productIds = new Map<string, number>();
  for (const p of PRODUCTS) {
    const product = await prisma.product.create({
      data: {
        sku: p.sku,
        name: p.name,
        uom: p.uom,
        isActive: p.isActive ?? true,
        categoryId: required(categoryIds, p.category, "category"),
      },
    });
    productIds.set(p.sku, product.id);
  }

  await prisma.reorderRule.createMany({
    data: REORDER_RULES.map((r) => ({
      productId: required(productIds, r.sku, "product"),
      warehouseId: required(warehouseIds, r.warehouse, "warehouse"),
      minQty: r.minQty,
      maxQty: r.maxQty,
    })),
  });

  return { users: { manager: manager.id, staff: staff.id }, locations, productIds };
}

function linesToMoves(
  type: OperationType,
  lines: { productId: number; quantity: number; countedQuantity: number | null }[],
  sourceId: number,
  destId: number,
): MoveInput[] {
  return lines.flatMap((line): MoveInput[] => {
    if (type !== "ADJUSTMENT") {
      return [{ productId: line.productId, fromLocationId: sourceId, toLocationId: destId, quantity: line.quantity }];
    }
    const diff = (line.countedQuantity ?? 0) - line.quantity;
    if (diff > 0) return [{ productId: line.productId, fromLocationId: sourceId, toLocationId: destId, quantity: diff }];
    if (diff < 0) return [{ productId: line.productId, fromLocationId: destId, toLocationId: sourceId, quantity: -diff }];
    return [];
  });
}

async function createOperation(spec: OperationSpec, refs: SeedRefs): Promise<string> {
  const source = required(refs.locations, spec.from, "location");
  const dest = required(refs.locations, spec.to, "location");
  const internal = spec.type === "RECEIPT" || spec.type === "ADJUSTMENT" ? dest : source;
  if (!internal.warehouseCode) throw new Error(`Seed data error: ${spec.type} needs an INTERNAL location`);

  const isDone = spec.status === "DONE";
  const scheduledDate = dayAt(spec.day, 9);
  const doneAt = isDone ? dayAt(spec.day, 15) : null;
  const createdAt = new Date(Math.min(scheduledDate.getTime(), Date.now()) - DAY_MS);
  const userId = refs.users[spec.by];

  return prisma.$transaction(async (tx) => {
    const reference = await nextReference(tx, spec.type, internal.warehouseCode!);

    const lines = await Promise.all(
      spec.lines.map(async (line) => {
        const productId = required(refs.productIds, line.sku, "product");
        if (spec.type !== "ADJUSTMENT") {
          return { productId, quantity: line.quantity ?? 0, countedQuantity: null };
        }
        // Validation records the system quantity at that moment; drafts keep 0.
        const recorded = isDone ? await getQuantity(tx, productId, dest.id) : 0;
        return { productId, quantity: recorded, countedQuantity: line.counted ?? 0 };
      }),
    );

    const operation = await tx.operation.create({
      data: {
        reference,
        type: spec.type,
        status: spec.status,
        sourceLocationId: source.id,
        destLocationId: dest.id,
        partnerName: spec.partner ?? null,
        scheduledDate,
        doneAt,
        notes: spec.notes ?? null,
        createdById: userId,
        createdAt,
        lines: { create: lines },
      },
    });

    if (isDone) {
      await applyMoves(tx, linesToMoves(spec.type, lines, source.id, dest.id), {
        type: spec.type,
        reference,
        userId,
        operationId: operation.id,
        at: doneAt!,
      });
    }
    return reference;
  });
}

async function assertQuantsMatchMoves(): Promise<void> {
  const [internalLocations, quants, inbound, outbound] = await Promise.all([
    prisma.location.findMany({ where: { type: "INTERNAL" }, select: { id: true } }),
    prisma.stockQuant.findMany({ select: { productId: true, locationId: true, quantity: true } }),
    prisma.stockMove.groupBy({ by: ["productId", "toLocationId"], _sum: { quantity: true } }),
    prisma.stockMove.groupBy({ by: ["productId", "fromLocationId"], _sum: { quantity: true } }),
  ]);
  const internalIds = new Set(internalLocations.map((l) => l.id));
  const key = (productId: number, locationId: number) => `${productId}@${locationId}`;

  const net = new Map<string, number>();
  for (const row of inbound) {
    if (!internalIds.has(row.toLocationId)) continue;
    const k = key(row.productId, row.toLocationId);
    net.set(k, (net.get(k) ?? 0) + (row._sum.quantity ?? 0));
  }
  for (const row of outbound) {
    if (!internalIds.has(row.fromLocationId)) continue;
    const k = key(row.productId, row.fromLocationId);
    net.set(k, (net.get(k) ?? 0) - (row._sum.quantity ?? 0));
  }

  const problems: string[] = [];
  const quantKeys = new Set<string>();
  for (const q of quants) {
    const k = key(q.productId, q.locationId);
    quantKeys.add(k);
    if (!internalIds.has(q.locationId)) problems.push(`quant at non-INTERNAL location ${k}`);
    const expected = net.get(k) ?? 0;
    if (Math.abs(q.quantity - expected) > EPSILON) problems.push(`${k}: quant ${q.quantity} ≠ net moves ${expected}`);
  }
  for (const [k, value] of net) {
    if (!quantKeys.has(k) && Math.abs(value) > EPSILON) problems.push(`${k}: net moves ${value} but no quant`);
  }

  if (problems.length > 0) {
    throw new Error(`Stock consistency check failed:\n  ${problems.join("\n  ")}`);
  }
}

async function printSummary(): Promise<void> {
  const counts = {
    users: await prisma.user.count(),
    warehouses: await prisma.warehouse.count(),
    locations: await prisma.location.count(),
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    reorderRules: await prisma.reorderRule.count(),
    operations: await prisma.operation.count(),
    operationLines: await prisma.operationLine.count(),
    stockQuants: await prisma.stockQuant.count(),
    stockMoves: await prisma.stockMove.count(),
    sequences: await prisma.sequence.count(),
  };
  const flagged = (await getStockSummary(prisma)).filter((row) => row.status !== "OK");

  console.log("\nStockSense seed complete. Stock consistency check passed.\n");
  console.table(counts);
  console.log("Products that are not OK:");
  for (const row of flagged) console.log(`  ${row.status.padEnd(3)}  ${row.sku.padEnd(10)} ${row.name} (${row.onHand} ${row.uom})`);
  console.log("\nDemo logins:");
  for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(7)}  ${u.email} / ${u.password}`);
  console.log("");
}

async function main(): Promise<void> {
  await assertEmptyDatabase();
  const refs = await seedMasterData();
  for (const spec of OPERATIONS) await createOperation(spec, refs);
  await assertQuantsMatchMoves();
  await printSummary();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
