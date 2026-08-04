import { Router } from "express";
import {
  createUsuario,
  deactivateUsuario,
  getUsuario,
  listUsuarios,
  updateUsuario,
} from "../controllers/usuarios.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  usuarioIdSchema,
} from "../validators/usuarios.schema.js";

const router = Router();

router.use(requireAuth, requireRoles("ADMIN"));

router.get("/", listUsuarios);
router.get("/:id", validate(usuarioIdSchema), getUsuario);
router.post("/", validate(createUsuarioSchema), createUsuario);
router.put("/:id", validate(updateUsuarioSchema), updateUsuario);
router.delete("/:id", validate(usuarioIdSchema), deactivateUsuario);

export default router;
