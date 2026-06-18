// src/modules/ride-requests/ride-requests.service.ts
import { RideRequestsRepository } from "./ride-requests.repository.ts";
import { prisma } from "../../config/db.ts";

export class RideRequestsService {
  private repository = new RideRequestsRepository();

  private parseTimeStringToDate(input: string): Date {
    if (!/^\d{2}:\d{2}$/.test(input)) {
      const d = new Date(input);
      if (isNaN(d.getTime())) {
        return new Date();
      }
      return d;
    }
    const [hrs, mins] = input.split(":").map(Number);
    const date = new Date();
    date.setHours(hrs, mins, 0, 0);
    return date;
  }

  async createRideRequest(userId: string, data: any) {
    const departureTimeDate = this.parseTimeStringToDate(data.departureTime);

    // Save request
    const request = await this.repository.createRequest(userId, {
      pickupArea: data.pickupArea,
      destinationCampus: data.destinationCampus || "Main Campus",
      departureTime: departureTimeDate,
      flexibility: Number(data.flexibility),
      vehicleType: data.vehicleType || "Any",
      groupSize: Number(data.groupSize) || 3,
      travelDays: data.travelDays || "Mon,Tue,Wed,Thu,Fri",
      recurringSchedule: data.recurringSchedule || "Recurring",
    });

    // Write metric to AnalyticsRecord
    try {
      await prisma.analyticsRecord.create({
        data: {
          metricName: "RIDE_REQUEST_CREATED",
          metricValue: 1.0,
          dimension: data.pickupArea.toLowerCase().trim(),
        }
      });
    } catch (e) {
      console.error("Failed to write request analytics record", e);
    }

    return request;
  }

  async getUserRequests(userId: string) {
    return this.repository.findUserRequests(userId);
  }

  async deleteRideRequest(userId: string, requestId: string) {
    const request = await this.repository.findRequestById(requestId);
    if (!request) {
      throw new Error("Ride request not found");
    }

    if (request.userId !== userId) {
      throw new Error("Unauthorized to cancel this ride request");
    }

    // Cancel / Delete the request
    await this.repository.deleteRequest(requestId);
    return { success: true, message: "Ride request cancelled successfully" };
  }
}
