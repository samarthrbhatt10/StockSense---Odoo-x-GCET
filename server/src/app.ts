import express from "express";
import { ok } from "./lib/http";
import { requireAuth } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import alertsRoutes from "./modules/alerts/routes";
import authRoutes from "./modules/auth/routes";
import dashboardRoutes from "./modules/dashboard/routes";
import lookupsRoutes from "./modules/lookups/routes";
import movesRoutes from "./modules/moves/routes";
import operationsRoutes from "./modules/operations/routes";
import categoriesRoutes from "./modules/products/categories.routes";
import reorderRulesRoutes from "./modules/products/reorder-rules.routes";
import productsRoutes from "./modules/products/routes";
import searchRoutes from "./modules/search/routes";
import locationsRoutes from "./modules/settings/locations.routes";
import warehousesRoutes from "./modules/settings/warehouses.routes";

export const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  ok(res, { status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/lookups", requireAuth, lookupsRoutes);
app.use("/api/products", requireAuth, productsRoutes);
app.use("/api/categories", requireAuth, categoriesRoutes);
app.use("/api/reorder-rules", requireAuth, reorderRulesRoutes);
app.use("/api/warehouses", requireAuth, warehousesRoutes);
app.use("/api/locations", requireAuth, locationsRoutes);
app.use("/api/operations", requireAuth, operationsRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/moves", requireAuth, movesRoutes);
app.use("/api/alerts", requireAuth, alertsRoutes);
app.use("/api/search", requireAuth, searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
