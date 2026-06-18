// src/store.ts
import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  college: string;
  email: string;
  homeLocation: string;
  isVerified?: boolean;
  collegeEmail?: string;
  trustScore?: number;
  completedRidesCount?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
}

interface TravelIntent {
  pickupArea: string;
  destinationCampus: string;
  departureTime: string;
  flexibility: number;
  vehicleType: "Any" | "Auto" | "Cab";
  groupSize: number;
  travelDays: string;
  recurringSchedule: string;
}

interface MatchingState {
  intent: TravelIntent;
  setIntent: (intent: Partial<TravelIntent>) => void;
  matches: any[];
  setMatches: (matches: any[]) => void;
  searchLoading: boolean;
  setSearchLoading: (loading: boolean) => void;
}

// Read initial state from localStorage safely
const localUser = localStorage.getItem("cp_user");
const localToken = localStorage.getItem("cp_token");

export const useAuthStore = create<AuthState>((set) => ({
  user: localUser ? JSON.parse(localUser) : null,
  token: localToken || null,
  isLoading: false,
  error: null,
  setAuth: (user, token) => {
    if (user && token) {
      localStorage.setItem("cp_user", JSON.stringify(user));
      localStorage.setItem("cp_token", token);
    } else {
      localStorage.removeItem("cp_user");
      localStorage.removeItem("cp_token");
    }
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("cp_user");
    localStorage.removeItem("cp_token");
    set({ user: null, token: null, error: null });
  },
}));

export const useMatchingStore = create<MatchingState>((set) => ({
  intent: {
    pickupArea: "Salt Lake, Sector V",
    destinationCampus: "Main Campus",
    departureTime: "08:30",
    flexibility: 30,
    vehicleType: "Any",
    groupSize: 3,
    travelDays: "Mon,Tue,Wed,Thu,Fri",
    recurringSchedule: "Recurring",
  },
  setIntent: (newIntent) => set((state) => ({ intent: { ...state.intent, ...newIntent } })),
  matches: [],
  setMatches: (matches) => set({ matches }),
  searchLoading: false,
  setSearchLoading: (searchLoading) => set({ searchLoading }),
}));
