import { Router } from "express";
import { createVenta, listVentas } from "../controllers/ventas.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createVentaSchema } from "../validators/ventas.schema.js";

const router = Router();

router.get("/", requireAuth, requireRoles("ADMIN", "VENDEDOR", "ALMACEN"), listVentas);
router.post("/", requireAuth, requireRoles("ADMIN", "VENDEDOR", "ALMACEN"), validate(createVentaSchema), createVenta);

export default router;
