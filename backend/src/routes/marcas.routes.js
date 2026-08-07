import { Router } from "express";
import { createMarca, listMarcas } from "../controllers/marcas.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createCatalogoSchema } from "../validators/catalogos.schema.js";

const router = Router();

router.get("/", requireAuth, listMarcas);
router.post("/", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(createCatalogoSchema), createMarca);

export default router;
