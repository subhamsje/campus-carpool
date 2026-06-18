// src/modules/users/users.controller.ts
import { Request, Response } from "express";
import { UsersService } from "./users.service.ts";
import { UpdateProfileSchema } from "./users.validation.ts";
import { prisma } from "../../config/db.ts";

export class UsersController {
  private service = new UsersService();

  getUserMe = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const profile = await this.service.getProfile(userId);
      res.status(200).json({ success: true, user: profile });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  };

  updateUserMe = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const validated = UpdateProfileSchema.parse(req.body);
      const updated = await this.service.updateProfile(userId, validated);
      res.status(200).json({ success: true, user: updated, message: "Profile updated successfully" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(400).json({ success: false, message: error.message });
      }
    }
  };

  verifyStudent = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { collegeEmail } = req.body;

      if (!collegeEmail || !collegeEmail.includes("@")) {
        res.status(400).json({ success: false, message: "Please provide a valid college email address." });
        return;
      }

      const domain = collegeEmail.split("@")[1].toLowerCase();
      const isOfficialDomain = domain.endsWith(".edu") || domain.includes("college") || domain.includes("univ") || domain.includes("campus") || domain.endsWith(".ac.in");

      if (!isOfficialDomain) {
        res.status(400).json({ 
          success: false, 
          message: "Verification failed. Must use an official academic domain (e.g. name@campus.edu or name@univ.ac.in)" 
        });
        return;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
          collegeEmail,
          trustScore: 100, // Boost to maximum upon verification
        },
        select: {
          id: true,
          name: true,
          college: true,
          email: true,
          isVerified: true,
          collegeEmail: true,
          trustScore: true,
        },
      });

      res.status(200).json({ 
        success: true, 
        user: updated, 
        message: "Academic address verified! Real-time student verification badge awarded." 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  // Saved Routes CRUD
  getSavedRoutes = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const routes = await prisma.savedRoute.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      res.status(200).json({ success: true, data: routes });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  saveRoute = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { pickupArea, destinationCampus, departureTime, flexibility, vehicleType, groupSize, travelDays, recurringSchedule } = req.body;

      if (!pickupArea || !destinationCampus) {
        res.status(400).json({ success: false, message: "Missing pickupArea or destinationCampus." });
        return;
      }

      const saved = await prisma.savedRoute.create({
        data: {
          userId,
          pickupArea,
          destinationCampus: destinationCampus || "Main Campus",
          departureTime: departureTime || "08:30",
          flexibility: parseInt(flexibility) || 30,
          vehicleType: vehicleType || "Any",
          groupSize: parseInt(groupSize) || 3,
          travelDays: travelDays || "Mon,Tue,Wed,Thu,Fri",
          recurringSchedule: recurringSchedule || "Recurring",
        }
      });

      res.status(200).json({ success: true, data: saved, message: "Route pinned to your favorites successfully!" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  deleteSavedRoute = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      await prisma.savedRoute.deleteMany({
        where: {
          id,
          userId,
        }
      });

      res.status(200).json({ success: true, message: "Pinned route removed successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  // Favorites Management
  getFavorites = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const favoritesList = await prisma.favoritePartner.findMany({
        where: { userId },
      });

      const partnerIds = favoritesList.map((f) => f.partnerId);

      const classmates = await prisma.user.findMany({
        where: {
          id: { in: partnerIds }
        },
        select: {
          id: true,
          name: true,
          college: true,
          email: true,
          isVerified: true,
          trustScore: true,
          reliabilityScore: true,
        }
      });

      res.status(200).json({ success: true, data: classmates });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  toggleFavorite = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { partnerId } = req.body;

      if (!partnerId) {
        res.status(400).json({ success: false, message: "Missing partnerId" });
        return;
      }

      const existing = await prisma.favoritePartner.findFirst({
        where: { userId, partnerId },
      });

      let added = false;
      if (existing) {
        await prisma.favoritePartner.delete({
          where: { id: existing.id }
        });
      } else {
        await prisma.favoritePartner.create({
          data: { userId, partnerId }
        });
        added = true;
      }

      res.status(200).json({ 
        success: true, 
        added, 
        message: added ? "Co-traveler pinned to preferred travel partners list!" : "Co-traveler removed from preferred list." 
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}

