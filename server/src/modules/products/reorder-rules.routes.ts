import { Router } from "express";
import { AppError } from "../../lib/http";

const router = Router();

router.get("/", () => {
  throw new AppError(501, "NOT_IMPLEMENTED", "Reorder rules is not implemented yet");
});

export default router;
