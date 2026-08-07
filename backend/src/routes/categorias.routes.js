import { Router } from "express";
import { createCategoria, listCategorias } from "../controllers/categorias.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createCatalogoSchema } from "../validators/catalogos.schema.js";

const router = Router();

router.get("/", requireAuth, listCategorias);
router.post("/", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(createCatalogoSchema), createCategoria);

export default router;
