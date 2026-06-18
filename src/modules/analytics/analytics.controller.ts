// src/modules/analytics/analytics.controller.ts
import { Request, Response } from "express";
import { AnalyticsService } from "./analytics.service.ts";

export class AnalyticsController {
  private service = new AnalyticsService();

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.service.getDashboardAnalytics();
      res.status(200).json({ success: true, ...stats });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
