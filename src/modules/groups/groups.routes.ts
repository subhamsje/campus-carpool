// src/modules/groups/groups.routes.ts
import { Router } from "express";
import { GroupsController } from "./groups.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new GroupsController();

router.get("/", authenticateJWT, controller.getMyGroups);
router.post("/join", authenticateJWT, controller.join);
router.post("/create", authenticateJWT, controller.createGroup);
router.post("/rate", authenticateJWT, controller.ratePartner);
router.get("/:id", authenticateJWT, controller.getGroupById);
router.post("/:id/complete", authenticateJWT, controller.completeGroup);
router.get("/:id/messages", authenticateJWT, controller.getGroupMessages);
router.post("/:id/messages", authenticateJWT, controller.sendGroupMessage);
router.delete("/:id/leave", authenticateJWT, controller.leave);

export default router;

