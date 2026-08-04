import { Router } from "express";
import { createProducto, listProductos } from "../controllers/productos.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createProductoSchema } from "../validators/productos.schema.js";

const router = Router();

router.get("/", requireAuth, listProductos);
router.post("/", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(createProductoSchema), createProducto);

export default router;
