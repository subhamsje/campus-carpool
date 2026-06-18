// src/modules/groups/groups.repository.ts
import { prisma } from "../../config/db.ts";

export class GroupsRepository {
  async findGroupsForUser(userId: string) {
    return prisma.rideGroup.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId, deletedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true, college: true, email: true, homeLocation: true }
            }
          }
        },
        rideRequests: {
          where: { deletedAt: null }
        },
      }
    });
  }

  async findGroupById(id: string) {
    return prisma.rideGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        members: {
          where: { deletedAt: null },
          include: {
            user: {
              select: { id: true, name: true, college: true, email: true, homeLocation: true }
            }
          }
        },
        rideRequests: {
          where: { deletedAt: null }
        },
      }
    });
  }

  async createGroup(data: {
    pickupArea: string;
    destinationCampus?: string;
    departureTime: Date;
    matchScore: number;
    vehicleType?: string;
    travelDays?: string;
    recurringSchedule?: string;
  }) {
    return prisma.rideGroup.create({
      data: {
        pickupArea: data.pickupArea,
        destinationCampus: data.destinationCampus || "Main Campus",
        departureTime: data.departureTime,
        matchScore: data.matchScore,
        travelDays: data.travelDays || "Mon,Tue,Wed,Thu,Fri",
        recurringSchedule: data.recurringSchedule || "Recurring",
        status: "FORMING",
      }
    });
  }

  async addMemberToGroup(groupId: string, userId: string) {
    const existing = await prisma.rideGroupMember.findFirst({
      where: {
        groupId,
        userId,
      }
    });
    if (existing && !existing.deletedAt) {
      return existing;
    }
    if (existing && existing.deletedAt) {
      return await prisma.rideGroupMember.update({
        where: { id: existing.id },
        data: { deletedAt: null, joinedAt: new Date() }
      });
    }

    try {
      return await prisma.rideGroupMember.create({
        data: {
          groupId,
          userId,
        }
      });
    } catch (e) {
      return prisma.rideGroupMember.findFirst({
        where: {
          groupId,
          userId,
        }
      });
    }
  }

  async deleteMemberFromGroup(groupId: string, userId: string) {
    const member = await prisma.rideGroupMember.findFirst({
      where: { groupId, userId, deletedAt: null }
    });
    if (!member) return null;

    return prisma.rideGroupMember.update({
      where: { id: member.id },
      data: { deletedAt: new Date() }
    });
  }

  async linkRideRequestToGroup(requestId: string, groupId: string) {
    return prisma.rideRequest.update({
      where: { id: requestId },
      data: {
        groupId,
        status: "MATCHED"
      }
    });
  }
}
