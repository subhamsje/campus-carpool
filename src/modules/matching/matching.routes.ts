// src/modules/matching/matching.routes.ts
import { Router } from "express";
import { MatchingController } from "./matching.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new MatchingController();

router.post("/search", authenticateJWT, controller.searchMatches);
router.get("/heatmap", authenticateJWT, controller.getHeatmapData);
router.get("/notifications", authenticateJWT, controller.getWaitlistNotifications);
router.post("/notifications/dismiss", authenticateJWT, controller.dismissNotification);


export default router;
