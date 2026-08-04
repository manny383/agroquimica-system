import { Router } from "express";
import { ajustarInventario, listInventario } from "../controllers/inventario.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ajustarInventarioSchema } from "../validators/inventario.schema.js";

const router = Router();

router.get("/", requireAuth, listInventario);
router.post("/ajustes", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(ajustarInventarioSchema), ajustarInventario);

export default router;
