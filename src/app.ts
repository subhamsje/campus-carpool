import express, { Express } from "express";
import authRoutes from "./modules/auth/auth.routes.ts";
import usersRoutes from "./modules/users/users.routes.ts";
import ridesRoutes from "./modules/ride-requests/ride-requests.routes.ts";
import matchingRoutes from "./modules/matching/matching.routes.ts";
import groupsRoutes from "./modules/groups/groups.routes.ts";
import analyticsRoutes from "./modules/analytics/analytics.routes.ts";
import trustRoutes from "./modules/trust/trust.routes.ts";
import notificationRoutes from "./modules/notifications/notifications.routes.ts";

export default function appSetup(app: Express) {
  app.use(express.json());

  // API Healthcheck
  app.get("/api/v1/health", (req, res) => {
    res.json({ 
        status: "ok", 
        message: "Campus Carpool API is running Successfully",
        timestamp: new Date().toISOString() 
    });
  });

  // Register real modular route handlings
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", usersRoutes);
  app.use("/api/v1/rides", ridesRoutes);
  app.use("/api/v1/matching", matchingRoutes);
  app.use("/api/v1/groups", groupsRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/trust", trustRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
}
