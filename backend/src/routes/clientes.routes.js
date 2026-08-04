import { Router } from "express";
import { createCliente, listClientes } from "../controllers/clientes.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createClienteSchema } from "../validators/clientes.schema.js";

const router = Router();

router.get("/", requireAuth, listClientes);
router.post("/", requireAuth, requireRoles("ADMIN", "VENDEDOR"), validate(createClienteSchema), createCliente);

export default router;
