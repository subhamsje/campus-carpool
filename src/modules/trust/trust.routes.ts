// src/modules/trust/trust.routes.ts
import { Router } from "express";
import { TrustController } from "./trust.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new TrustController();

router.use(authenticateJWT);
router.get("/", controller.getScore);

export default router;
