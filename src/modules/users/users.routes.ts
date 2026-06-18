// src/modules/users/users.routes.ts
import { Router } from "express";
import { UsersController } from "./users.controller.ts";
import { authenticateJWT } from "../../shared/auth.middleware.ts";

const router = Router();
const controller = new UsersController();

// Protected routes
router.get("/me", authenticateJWT, controller.getUserMe);
router.patch("/me", authenticateJWT, controller.updateUserMe);
router.post("/verify", authenticateJWT, controller.verifyStudent);

// Favorites Configuration
router.get("/favorites", authenticateJWT, controller.getFavorites);
router.post("/favorites/toggle", authenticateJWT, controller.toggleFavorite);

// Saved Routes Configuration
router.get("/routes", authenticateJWT, controller.getSavedRoutes);
router.post("/routes", authenticateJWT, controller.saveRoute);
router.delete("/routes/:id", authenticateJWT, controller.deleteSavedRoute);

export default router;

