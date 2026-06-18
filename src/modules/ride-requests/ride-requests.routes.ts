// src/modules/ride-requests/ride-requests.routes.ts
import { Router } from "express";
import { RideRequestsController } from "./ride-requests.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new RideRequestsController();

router.post("/", authenticateJWT, controller.createRide);
router.get("/", authenticateJWT, controller.getMyRides);
router.delete("/:id", authenticateJWT, controller.cancelRide);

export default router;
