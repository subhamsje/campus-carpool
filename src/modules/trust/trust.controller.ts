// src/modules/trust/trust.controller.ts
import { Request, Response } from "express";
import { TrustService } from "./trust.service.ts";

export class TrustController {
  private service = new TrustService();

  getScore = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const score = await this.service.getUserTrustScore(userId);
      res.status(200).json({ success: true, data: score });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
