import { Router } from "express";
import { createProducto, listProductos, updateCodigoBarras } from "../controllers/productos.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createProductoSchema, codigoBarrasSchema } from "../validators/productos.schema.js";

const router = Router();

router.get("/", requireAuth, listProductos);
router.post("/", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(createProductoSchema), createProducto);
router.patch("/:id/codigo-barras", requireAuth, requireRoles("ADMIN"), validate(codigoBarrasSchema), updateCodigoBarras);

export default router;
