// src/modules/ride-requests/ride-requests.controller.ts
import { Request, Response } from "express";
import { RideRequestsService } from "./ride-requests.service.ts";
import { CreateRideRequestSchema } from "./ride-requests.validation.ts";

export class RideRequestsController {
  private service = new RideRequestsService();

  createRide = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const validated = CreateRideRequestSchema.parse(req.body);
      const request = await this.service.createRideRequest(userId, validated);
      res.status(201).json({ success: true, data: request, message: "Ride request submitted successfully" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  };

  getMyRides = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const list = await this.service.getUserRequests(userId);
      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  cancelRide = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await this.service.deleteRideRequest(userId, id);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
