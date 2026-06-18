// src/modules/analytics/analytics.routes.ts
import { Router } from "express";
import { AnalyticsController } from "./analytics.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new AnalyticsController();

// Open route for dashboard, can also be authenticated. Let's make it authenticated or flexible.
router.get("/", controller.getStats);

export default router;
