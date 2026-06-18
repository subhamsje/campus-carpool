// src/modules/groups/groups.controller.ts
import { Request, Response } from "express";
import { GroupsService } from "./groups.service.ts";
import { prisma } from "../../config/db.ts";

export class GroupsController {
  private service = new GroupsService();

  getMyGroups = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const fileList = await this.service.getUserGroups(userId);
      res.status(200).json({ success: true, data: fileList });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getGroupById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const group = await this.service.getGroupDetail(id);
      res.status(200).json({ success: true, data: group });
    } catch (error: any) {
      res.status(404).json({ success: false, message: error.message });
    }
  };

  join = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { groupId } = req.body;

      if (!groupId) {
        res.status(400).json({ success: false, message: "groupId is required" });
        return;
      }

      const updated = await this.service.joinGroup(userId, groupId);
      res.status(200).json({ success: true, data: updated, message: "Successfully joined the group!" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  createGroup = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { pickupArea, destinationCampus, departureTime, matchScore, travelDays, recurringSchedule, candidateRequestIds } = req.body;

      if (!pickupArea || !departureTime) {
        res.status(400).json({ success: false, message: "pickupArea and departureTime of session are required" });
        return;
      }

      const generated = await this.service.createGroupWithMembers(userId, {
        pickupArea,
        destinationCampus,
        departureTime,
        matchScore: matchScore || 100,
        travelDays,
        recurringSchedule,
        candidateRequestIds,
      });

      res.status(201).json({ success: true, data: generated, message: "Group formed successfully!" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  leave = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      const { id } = req.params;
      const result = await this.service.leaveGroup(userId, id);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  completeGroup = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const group = await prisma.rideGroup.findUnique({
        where: { id },
        include: { members: true }
      });

      if (!group) {
        res.status(404).json({ success: false, message: "Ride group not found" });
        return;
      }

      // Check if user is a member
      const isMember = group.members.some((m) => m.userId === userId);
      if (!isMember) {
        res.status(403).json({ success: false, message: "Unauthorized. You are not a member of this squad." });
        return;
      }

      // Update status to COMPLETED
      await prisma.rideGroup.update({
        where: { id },
        data: { status: "COMPLETED" },
      });

      // Reward stats & counts
      for (const member of group.members) {
        await prisma.user.update({
          where: { id: member.userId },
          data: {
            completedRidesCount: { increment: 1 },
            trustScore: { increment: 2 }, // Small bump for successful ride
          }
        }).catch(() => null);
      }

      // Record Completed Commute Metric in analytics
      await prisma.analyticsRecord.create({
        data: {
          metricName: "RIDE_COMPLETED",
          metricValue: 1.0,
          dimension: group.pickupArea,
        }
      }).catch(() => null);

      res.status(200).json({ success: true, message: "Commute marked as COMPLETED! Verified trip registered on ledger." });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getGroupMessages = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;

      const registration = await prisma.rideGroupMember.findFirst({
        where: { groupId: id, userId }
      });

      if (!registration) {
        res.status(403).json({ success: false, message: "You are not a member of this squad chat" });
        return;
      }

      const logs = await prisma.groupChatMessage.findMany({
        where: { groupId: id },
        orderBy: { sentAt: "asc" }
      });

      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  sendGroupMessage = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.userId;
      const { message } = req.body;

      if (!message || message.trim() === "") {
        res.status(400).json({ success: false, message: "Message is required" });
        return;
      }

      const registration = await prisma.rideGroupMember.findFirst({
        where: { groupId: id, userId },
        include: { user: true }
      });

      if (!registration) {
        res.status(403).json({ success: false, message: "You must be a member to publish messages" });
        return;
      }

      const chat = await prisma.groupChatMessage.create({
        data: {
          groupId: id,
          userId,
          userName: registration.user.name,
          message: message,
        }
      });

      res.status(201).json({ success: true, data: chat });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  ratePartner = async (req: Request, res: Response) => {
    try {
      const { partnerId, rating } = req.body;

      if (!partnerId || rating === undefined) {
        res.status(400).json({ success: false, message: "Missing partnerId or rating" });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: partnerId } });
      if (!user) {
        res.status(404).json({ success: false, message: "Classmate not found" });
        return;
      }

      // Calculate new trust score safely
      const stars = parseInt(rating);
      let calculatedVal = user.trustScore;
      if (stars >= 4) {
        calculatedVal = Math.min(100, user.trustScore + (stars === 5 ? 3 : 1));
      } else {
        calculatedVal = Math.max(40, user.trustScore - (stars <= 2 ? 6 : 3));
      }

      await prisma.user.update({
        where: { id: partnerId },
        data: {
          trustScore: calculatedVal,
          reliabilityScore: stars >= 4 ? Math.min(100, user.reliabilityScore + 2) : Math.max(50, user.reliabilityScore - 5),
        }
      });

      res.status(200).json({ success: true, message: "Thank you! Peer evaluation registered securely." });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}

