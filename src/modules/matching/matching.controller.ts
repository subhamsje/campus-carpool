// src/modules/matching/matching.controller.ts
import { Request, Response } from "express";
import { MatchingService, TravelIntentDTO } from "./matching.service.ts";
import { prisma } from "../../config/db.ts";

function formatTimeToHHMM(date: Date): string {
  const hrs = date.getHours().toString().padStart(2, "0");
  const mins = date.getMinutes().toString().padStart(2, "0");
  return `${hrs}:${mins}`;
}

export class MatchingController {
  private service = new MatchingService();

  searchMatches = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;
      
      const intent: TravelIntentDTO = {
        pickupArea: req.body.pickupArea,
        destinationCampus: req.body.destinationCampus || "Main Campus",
        departureTime: req.body.departureTime,
        flexibility: req.body.flexibility !== undefined ? Number(req.body.flexibility) : 30,
        vehicleType: req.body.vehicleType || "Any",
        groupSize: req.body.groupSize !== undefined ? Number(req.body.groupSize) : 3,
        travelDays: req.body.travelDays || "Mon,Tue,Wed,Thu,Fri",
        recurringSchedule: req.body.recurringSchedule || "Recurring",
      };

      if (!intent.pickupArea || !intent.departureTime) {
        res.status(400).json({ success: false, message: "Missing pickupArea or departureTime" });
        return;
      }

      const results = await this.service.findMatches(userId, intent);
      res.status(200).json({ success: true, data: results });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getWaitlistNotifications = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.userId;

      // 1. Fetch active SEARCHING ride requests
      const userRequests = await prisma.rideRequest.findMany({
        where: {
          userId,
          status: "SEARCHING",
        },
      });

      // 2. Scan each request to see if compatible matches (score >= 70) exist now
      for (const rideRequest of userRequests) {
        const intent: TravelIntentDTO = {
          pickupArea: rideRequest.pickupArea,
          destinationCampus: rideRequest.destinationCampus,
          departureTime: formatTimeToHHMM(rideRequest.departureTime),
          flexibility: rideRequest.flexibility,
          vehicleType: rideRequest.vehicleType,
          groupSize: rideRequest.groupSize,
          travelDays: rideRequest.travelDays,
          recurringSchedule: rideRequest.recurringSchedule,
        };

        const matches = await this.service.findMatches(userId, intent);

        const highlyCompatible = matches.filter((m) => m.matchScore >= 70);

        for (const match of highlyCompatible) {
          const matchIdentifier = match.isExistingGroup 
            ? match.id! 
            : `synthesized-${match.pickupArea.toLowerCase().replace(/[\s,.-]+/g, "-")}`;

          // Check if already notified
          const existingNotification = await prisma.waitlistNotification.findFirst({
            where: {
              userId,
              requestId: rideRequest.id,
              groupId: matchIdentifier,
            },
          });

          if (!existingNotification) {
            await prisma.waitlistNotification.create({
              data: {
                userId,
                requestId: rideRequest.id,
                groupId: matchIdentifier,
                source: rideRequest.pickupArea,
                target: rideRequest.destinationCampus,
                message: match.isExistingGroup
                  ? `New compatible ride-share group "${match.name}" has been synthesized! (Match: ${Math.round(match.matchScore)}%)`
                  : `New compatible co-travelers pool synthesized from ${rideRequest.pickupArea} to ${rideRequest.destinationCampus}!`,
              },
            });
          }
        }
      }

      // 3. Retrieve all non-dismissed notifications
      const notifications = await prisma.waitlistNotification.findMany({
        where: {
          userId,
          dismissed: false,
        },
        orderBy: {
          notifiedAt: "desc",
        },
      });

      res.status(200).json({ success: true, data: notifications });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  dismissNotification = async (req: Request, res: Response) => {
    try {
      const { notificationId } = req.body;
      if (!notificationId) {
        res.status(400).json({ success: false, message: "Missing notificationId" });
        return;
      }

      await prisma.waitlistNotification.update({
        where: { id: notificationId },
        data: { dismissed: true },
      });

      res.status(200).json({ success: true, message: "Notification marked as dismissed" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };

  getHeatmapData = async (req: Request, res: Response) => {
    try {
      // Query database requests & groups to identify hot lanes
      const requests = await prisma.rideRequest.findMany({
        where: { status: "SEARCHING" },
        select: { pickupArea: true, destinationCampus: true }
      });

      const groups = await prisma.rideGroup.findMany({
        where: { status: "FORMING" },
        include: { members: true }
      });

      const counts: Record<string, { source: string; target: string; activeStudents: number; groupCount: number; requestCount: number; density: 'High' | 'Medium' | 'Low' }> = {};

      requests.forEach((r) => {
        const key = `${r.pickupArea.trim()} ➔ ${r.destinationCampus.trim()}`;
        if (!counts[key]) {
          counts[key] = {
            source: r.pickupArea,
            target: r.destinationCampus,
            activeStudents: 0,
            groupCount: 0,
            requestCount: 0,
            density: 'Low'
          };
        }
        counts[key].requestCount++;
        counts[key].activeStudents++;
      });

      groups.forEach((g) => {
        const key = `${g.pickupArea.trim()} ➔ ${g.destinationCampus.trim()}`;
        if (!counts[key]) {
          counts[key] = {
            source: g.pickupArea,
            target: g.destinationCampus,
            activeStudents: 0,
            groupCount: 0,
            requestCount: 0,
            density: 'Low'
          };
        }
        counts[key].groupCount++;
        counts[key].activeStudents += g.members.length;
      });

      const list = Object.values(counts);

      list.forEach((item) => {
        const total = item.activeStudents;
        if (total >= 5) {
          item.density = 'High';
        } else if (total >= 2) {
          item.density = 'Medium';
        } else {
          item.density = 'Low';
        }
      });

      // Seed with default university lanes if dry
      if (list.length === 0) {
        list.push(
          { source: "Salt Lake, Sector V", target: "Main Campus", activeStudents: 12, groupCount: 2, requestCount: 4, density: "High" },
          { source: "New Town, Action Area I", target: "Main Campus", activeStudents: 8, groupCount: 1, requestCount: 3, density: "High" },
          { source: "Howrah Bus Stand", target: "Main Campus", activeStudents: 4, groupCount: 1, requestCount: 1, density: "Medium" },
          { source: "Gariahat Crossing", target: "Main Campus", activeStudents: 3, groupCount: 0, requestCount: 3, density: "Medium" },
          { source: "Main Campus", target: "Howrah Bus Stand", activeStudents: 1, groupCount: 0, requestCount: 1, density: "Low" }
        );
      }

      // Sort by density high->low
      list.sort((a, b) => b.activeStudents - a.activeStudents);

      res.status(200).json({ success: true, data: list });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
