import { Router } from "express";
import { list } from "../../lib/http";
import { parse } from "../../lib/validate";
import { movesQuerySchema } from "./schemas";
import * as movesService from "./service";

const router = Router();

router.get("/", async (req, res) => {
  const query = parse(movesQuerySchema, req.query);
  const { items, meta } = await movesService.listMoves(query);
  list(res, items, meta);
});

export default router;
