import { Router } from "express";
import { login, register } from "../controllers/auth.controller.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loginSchema, registerSchema } from "../validators/auth.schema.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/register", requireAuth, requireRoles("ADMIN"), validate(registerSchema), register);

export default router;
