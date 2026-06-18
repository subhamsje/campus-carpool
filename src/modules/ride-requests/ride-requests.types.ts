// src/modules/ride-requests/ride-requests.types.ts

export interface CreateRideRequestDTO {
  pickupArea: string;
  departureTime: string; // ISO String or Local string
  flexibility: number;   // In minutes (e.g., 15, 30)
  vehicleType: "Any" | "Auto" | "Cab";
  groupSize: number;
}
