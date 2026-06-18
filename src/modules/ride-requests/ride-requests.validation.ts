// src/modules/ride-requests/ride-requests.validation.ts
import { z } from "zod";

export const CreateRideRequestSchema = z.object({
  pickupArea: z.string().min(2, "Pickup area is required"),
  destinationCampus: z.string().min(2, "Destination campus is required").default("Main Campus"),
  departureTime: z.string().refine((val) => !isNaN(Date.parse(val)) || /^\d{2}:\d{2}$/.test(val), {
    message: "Must be a valid date or HH:MM string",
  }),
  flexibility: z.number().min(0, "Flexibility must be 0 or dynamic minutes").default(30),
  vehicleType: z.enum(["Any", "Auto", "Cab"]).default("Any"),
  groupSize: z.number().min(1, "Preferred group size must be at least 1").default(3),
  travelDays: z.string().default("Mon,Tue,Wed,Thu,Fri"),
  recurringSchedule: z.string().default("Recurring"),
});
