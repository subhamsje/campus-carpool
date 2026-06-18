// src/modules/notifications/notifications.routes.ts
import { Router } from "express";
import { NotificationsController } from "./notifications.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new NotificationsController();

router.use(authenticateJWT);
router.get("/", controller.getNotifications);
router.put("/:id/read", controller.markAsRead);

export default router;
