// src/modules/ride-requests/ride-requests.repository.ts
import { prisma } from "../../config/db.ts";

export class RideRequestsRepository {
  async createRequest(userId: string, data: {
    pickupArea: string;
    destinationCampus: string;
    departureTime: Date;
    flexibility: number;
    vehicleType: string;
    groupSize: number;
    travelDays: string;
    recurringSchedule: string;
  }) {
    return prisma.rideRequest.create({
      data: {
        userId,
        pickupArea: data.pickupArea,
        destinationCampus: data.destinationCampus,
        departureTime: data.departureTime,
        flexibility: data.flexibility,
        vehicleType: data.vehicleType,
        groupSize: data.groupSize,
        travelDays: data.travelDays,
        recurringSchedule: data.recurringSchedule,
        status: "SEARCHING",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            college: true,
          }
        },
        rideGroup: true,
      }
    });
  }

  async findRequestById(id: string) {
    return prisma.rideRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        rideGroup: true,
      }
    });
  }

  async findUserRequests(userId: string) {
    return prisma.rideRequest.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        rideGroup: {
          include: {
            members: {
              where: { deletedAt: null },
              include: {
                user: {
                  select: { id: true, name: true, college: true, email: true }
                }
              }
            }
          }
        }
      }
    });
  }

  async deleteRequest(id: string) {
    return prisma.rideRequest.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }

  async updateRequestStatus(id: string, status: string, groupId?: string | null) {
    return prisma.rideRequest.update({
      where: { id },
      data: {
        status,
        groupId: groupId !== undefined ? groupId : undefined,
      },
    });
  }

  // To search for matching candidates
  async findCandidates(exceptUserId: string, excludeRequestIds: string[]) {
    return prisma.rideRequest.findMany({
      where: {
        status: "SEARCHING",
        userId: { not: exceptUserId },
        id: { notIn: excludeRequestIds },
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            college: true,
            email: true,
            homeLocation: true,
          }
        }
      }
    });
  }
}
