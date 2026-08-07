import { Router } from "express";
import { listAlmacenes } from "../controllers/almacenes.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, listAlmacenes);

export default router;
