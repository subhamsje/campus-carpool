// src/modules/groups/groups.service.ts
import { GroupsRepository } from "./groups.repository.ts";
import { prisma } from "../../config/db.ts";

export class GroupsService {
  private repository = new GroupsRepository();

  async getUserGroups(userId: string) {
    return this.repository.findGroupsForUser(userId);
  }

  async getGroupDetail(groupId: string) {
    const group = await this.repository.findGroupById(groupId);
    if (!group) {
      throw new Error("Ride group not found");
    }
    return group;
  }

  async joinGroup(userId: string, groupId: string) {
    const group = await this.repository.findGroupById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    // Check if already a member
    const isMember = group.members.some((m) => m.userId === userId);
    if (isMember) {
      throw new Error("You are already a member of this ride-share group");
    }

    // Associate
    await this.repository.addMemberToGroup(groupId, userId);

    // Write metric to AnalyticsRecord
    try {
      await prisma.analyticsRecord.create({
        data: {
          metricName: "RIDE_GROUP_JOINED",
          metricValue: 1.0,
          dimension: group.pickupArea.toLowerCase().trim(),
        }
      });
    } catch (e) {
      console.error(e);
    }

    return this.repository.findGroupById(groupId);
  }

  async createGroupWithMembers(userId: string, data: {
    pickupArea: string;
    destinationCampus?: string;
    departureTime: string; // HH:MM or ISO
    matchScore: number;
    travelDays?: string;
    recurringSchedule?: string;
    candidateRequestIds?: string[];
  }) {
    let deptDate = new Date();
    if (/^\d{2}:\d{2}$/.test(data.departureTime)) {
      const [hrs, mins] = data.departureTime.split(":").map(Number);
      deptDate.setHours(hrs, mins, 0, 0);
    } else {
      deptDate = new Date(data.departureTime);
    }

    // 1. Create forming group
    const group = await this.repository.createGroup({
      pickupArea: data.pickupArea,
      destinationCampus: data.destinationCampus,
      departureTime: deptDate,
      matchScore: data.matchScore,
      travelDays: data.travelDays,
      recurringSchedule: data.recurringSchedule,
    });

    // 2. Add creator
    await this.repository.addMemberToGroup(group.id, userId);

    // 3. Optional: Add dynamic matched candidates (co-travelers)
    if (data.candidateRequestIds && data.candidateRequestIds.length > 0) {
      for (const reqId of data.candidateRequestIds) {
        // Link requests
        await this.repository.linkRideRequestToGroup(reqId, group.id);

        // Fetch user from this request to add to group members
        const req = await prisma.rideRequest.findUnique({
          where: { id: reqId },
          select: { userId: true },
        });

        if (req && req.userId !== userId) {
          await this.repository.addMemberToGroup(group.id, req.userId);
        }
      }
    }

    // Link user's own active request for this route if exists
    const ownRequest = await prisma.rideRequest.findFirst({
      where: {
        userId,
        status: "SEARCHING",
        pickupArea: {
          contains: data.pickupArea, // Substring match is safe
        }
      }
    });

    if (ownRequest) {
      await this.repository.linkRideRequestToGroup(ownRequest.id, group.id);
    }

    // Write analytics records
    try {
      await prisma.analyticsRecord.create({
        data: {
          metricName: "RIDE_GROUP_CREATED",
          metricValue: 1.0,
          dimension: data.pickupArea.toLowerCase().trim(),
        }
      });
    } catch (e) {
      console.error(e);
    }

    return this.repository.findGroupById(group.id);
  }

  async leaveGroup(userId: string, groupId: string) {
    const group = await this.repository.findGroupById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    const isMember = group.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new Error("You are not a member of this group");
    }

    await this.repository.deleteMemberFromGroup(groupId, userId);

    // If no members are left, let's delete the group to keep the DB clean
    const updatedGroup = await this.repository.findGroupById(groupId);
    if (!updatedGroup || updatedGroup.members.length === 0) {
      await prisma.rideGroup.delete({
        where: { id: groupId }
      }).catch(() => null);
      return { success: true, message: "Left group. Group dissolved since empty." };
    }

    return { success: true, message: "Left group successfully" };
  }
}
