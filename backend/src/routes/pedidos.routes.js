import { Router } from "express";
import { createPedido, listPedidos, updateEstadoPedido } from "../controllers/pedidos.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createPedidoSchema, updateEstadoPedidoSchema } from "../validators/pedidos.schema.js";

const router = Router();

router.get("/", requireAuth, listPedidos);
router.post("/", requireAuth, requireRoles("ADMIN", "VENDEDOR", "CLIENTE"), validate(createPedidoSchema), createPedido);
router.patch("/:id/estado", requireAuth, requireRoles("ADMIN", "ALMACEN"), validate(updateEstadoPedidoSchema), updateEstadoPedido);

export default router;
