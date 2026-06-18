// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { AuthController } from "./auth.controller.ts";

const router = Router();
const controller = new AuthController();

router.post("/register", controller.register);
router.post("/login", controller.login);
router.post("/refresh", controller.refresh);
router.post("/logout", controller.logout);

export default router;
