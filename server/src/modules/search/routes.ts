import { Router } from "express";
import { ok } from "../../lib/http";
import { parse } from "../../lib/validate";
import { searchQuerySchema } from "./schemas";
import * as searchService from "./service";

const router = Router();

router.get("/", async (req, res) => {
  const { q } = parse(searchQuerySchema, req.query);
  ok(res, await searchService.search(q));
});

export default router;
