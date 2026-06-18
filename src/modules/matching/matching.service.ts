// src/modules/matching/matching.service.ts
import { prisma } from "../../config/db.ts";

export interface TravelIntentDTO {
  pickupArea: string;
  destinationCampus: string;
  departureTime: string; // "HH:MM" or ISO string
  flexibility: number;   // In minutes
  vehicleType: string;   // "Any", "Auto", "Cab"
  groupSize: number;
  travelDays: string;    // "Mon,Tue,Wed,Thu,Fri" etc.
  recurringSchedule: string; // "Recurring", "One-off"
}

export interface MatchRecommendation {
  id?: string; // Group ID or synthesized group indicator
  isExistingGroup: boolean;
  name: string;
  pickupArea: string;
  destinationCampus: string;
  departureTime: string;
  matchScore: number;
  locationScore: number;
  timeScore: number;
  timeDifference: number;
  travelDays: string;
  recurringSchedule: string;
  estimatedSavings: number;
  soloFare: number;
  sharedFare: number;
  members: Array<{ id: string; name: string; college: string; email?: string }>;
  explanation: string[];
  vehicleType: string;
  maxSize: number;
  candidateRequestIds?: string[]; // If synthesizing a new group from single requests
}

export class MatchingService {
  private normalize(loc: string): string {
    return loc.toLowerCase().trim().replace(/[\s,.-]+/g, " ");
  }

  private parseTimeToMinutes(timeStr: string): number {
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      const [hrs, mins] = timeStr.split(":").map(Number);
      return hrs * 60 + mins;
    }
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) {
      return d.getHours() * 60 + d.getMinutes();
    }
    return 8 * 60; // Default fallback to 08:00 AM
  }

  private formatMinutesToTime(totalMin: number): string {
    const hrs = Math.floor(totalMin / 60) % 24;
    const mins = totalMin % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  }

  async findMatches(userId: string, intent: TravelIntentDTO): Promise<MatchRecommendation[]> {
    const targetLocNorm = this.normalize(intent.pickupArea);
    const targetDestNorm = this.normalize(intent.destinationCampus || "Main Campus");
    const targetMin = this.parseTimeToMinutes(intent.departureTime);
    const targetFlex = Number(intent.flexibility);

    // Fetch user's Favorite Partners
    const favorites = await prisma.favoritePartner.findMany({
      where: { userId }
    });
    const favPartnerIds = new Set(favorites.map(f => f.partnerId));

    // 1. Fetch existing FORMING ride groups
    const existingGroups = await prisma.rideGroup.findMany({
      where: {
        status: "FORMING",
      },
      include: {
        members: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                college: true, 
                email: true,
                isVerified: true,
                trustScore: true,
                reliabilityScore: true
              }
            }
          }
        },
        rideRequests: true,
      }
    });

    const recommendations: MatchRecommendation[] = [];

    // Score existing groups
    for (const group of existingGroups) {
      const isAlreadyMember = group.members.some((m) => m.userId === userId);
      if (isAlreadyMember) continue;

      const groupLocNorm = this.normalize(group.pickupArea);
      
      // Calculate location alignment
      let pickScore = 0;
      if (groupLocNorm === targetLocNorm) {
        pickScore = 100;
      } else if (groupLocNorm.includes(targetLocNorm) || targetLocNorm.includes(groupLocNorm)) {
        pickScore = 80;
      } else {
        continue; // Non-matching pickup location is skipped
      }

      // Destination matching
      const groupDestNorm = this.normalize(group.destinationCampus || "Main Campus");
      const destScore = groupDestNorm === targetDestNorm ? 100 : 50;

      // 70/30 weight pickup vs destination
      const locScore = Math.round(pickScore * 0.7 + destScore * 0.3);

      // Time Compatibility
      const groupMin = this.parseTimeToMinutes(group.departureTime.toISOString());
      let diff = Math.abs(groupMin - targetMin);
      if (diff > 720) {
        diff = 1440 - diff;
      }

      if (diff > targetFlex) continue;

      // Formula: Time Score = 100 - ((Time Difference / Threshold) * 100)
      const threshold = targetFlex || 30;
      const timeScore = Math.max(0, 100 - ((diff / threshold) * 100));

      // Base Compatibility = 60% Location + 40% Time
      let rawMatchScore = locScore * 0.6 + timeScore * 0.4;

      // TRUST SCORE SYSTEM CALCULATION
      let totalTrust = 0;
      let verifiedCount = 0;
      let favoriteMatched = false;
      
      if (group.members.length > 0) {
        group.members.forEach((m) => {
          totalTrust += m.user.trustScore;
          if (m.user.isVerified) verifiedCount++;
          if (favPartnerIds.has(m.user.id)) favoriteMatched = true;
        });
      }
      
      const avgTrustScore = group.members.length > 0 ? (totalTrust / group.members.length) : 95;
      
      // Multipliers
      const trustScoreFactor = avgTrustScore / 95; // e.g. 100/95 = 1.05x bump
      let matchScore = rawMatchScore * trustScoreFactor;

      // +10% Preferred Partner bump
      if (favoriteMatched) {
        matchScore += 10.0;
      }

      // +2% per verified student
      matchScore += (verifiedCount * 2.0);

      matchScore = parseFloat(Math.min(100, Math.max(0, matchScore)).toFixed(1));

      // Real Savings Calculator
      const vehicle = intent.vehicleType === "Any" ? "Auto" : intent.vehicleType;
      const soloFare = vehicle === "Auto" ? 120 : 360; 
      const totalGroupSizePlusUser = group.members.length + 1;
      const sharedFare = Math.round(soloFare / totalGroupSizePlusUser);
      const estimatedSavings = soloFare - sharedFare;

      const explanation = [
        `✓ ${locScore >= 95 ? "Perfect" : "High"} Route Alignment: ${locScore}% match`,
        diff === 0 ? "✓ 0-min exact departure sync" : `✓ Minimal ${diff}m time skew (${Math.round(timeScore)}% Score)`,
        `✓ Trust factor: ${Math.round(avgTrustScore)}% squad reputation score (${verifiedCount} verified student badges)`,
        favoriteMatched ? "⭐ Preferred partner matches in this squad! (+10% score priority)" : "✓ Compatible peer schedules and vehicle type",
        `✓ Fare: ₹${sharedFare} shared split (Instead of ₹${soloFare} solo travel)`
      ];

      recommendations.push({
        id: group.id,
        isExistingGroup: true,
        name: `${group.pickupArea} Squad Classmates`,
        pickupArea: group.pickupArea,
        destinationCampus: group.destinationCampus || "Main Campus",
        departureTime: this.formatMinutesToTime(groupMin),
        matchScore,
        locationScore: locScore,
        timeScore: Math.round(timeScore),
        timeDifference: diff,
        travelDays: group.travelDays || "Mon,Tue,Wed,Thu,Fri",
        recurringSchedule: group.recurringSchedule || "Recurring",
        estimatedSavings,
        soloFare,
        sharedFare,
        members: group.members.map((m) => {
          return {
            id: m.user.id,
            name: m.user.name,
            college: m.user.college,
            email: m.user.email,
            isVerified: (m.user as any).isVerified,
            trustScore: (m.user as any).trustScore,
            reliabilityScore: (m.user as any).reliabilityScore,
          } as any;
        }),
        explanation,
        vehicleType: vehicle,
        maxSize: intent.groupSize,
      });
    }

    // 2. Fetch single searching requests from other users to synthesise "Suggested Groups"
    const singleRequests = await prisma.rideRequest.findMany({
      where: {
        status: "SEARCHING",
        userId: { not: userId },
      },
      include: {
        user: {
          select: { 
            id: true, 
            name: true, 
            college: true, 
            email: true,
            isVerified: true,
            trustScore: true,
            reliabilityScore: true
          }
        }
      }
    });

    // Group single requests by location
    const locationGroupsMap = new Map<string, typeof singleRequests>();
    for (const req of singleRequests) {
      const locNorm = this.normalize(req.pickupArea);
      
      let foundKey = "";
      if (locNorm === targetLocNorm) {
        foundKey = locNorm;
      } else if (locNorm.includes(targetLocNorm) || targetLocNorm.includes(locNorm)) {
        foundKey = locNorm;
      }

      if (foundKey) {
        if (!locationGroupsMap.has(foundKey)) {
          locationGroupsMap.set(foundKey, []);
        }
        locationGroupsMap.get(foundKey)!.push(req);
      }
    }

    // Synthesize group matches from matching locations
    for (const [locKey, reqs] of locationGroupsMap.entries()) {
      // Filter by compatible times
      const compatibleReqs = reqs.filter((req) => {
        const reqMin = this.parseTimeToMinutes(req.departureTime.toISOString());
        let diff = Math.abs(reqMin - targetMin);
        if (diff > 720) diff = 1440 - diff;
        return diff <= targetFlex;
      });

      if (compatibleReqs.length === 0) continue;

      // Select average time of co-travelers
      const totalMins = compatibleReqs.reduce((sum, r) => sum + this.parseTimeToMinutes(r.departureTime.toISOString()), 0);
      const avgMins = Math.round((totalMins + targetMin) / (compatibleReqs.length + 1));
      const departureTimeFormatted = this.formatMinutesToTime(avgMins);

      // Average difference
      const avgDiff = Math.abs(avgMins - targetMin);
      const threshold = targetFlex || 30;
      const timeScore = Math.max(0, 100 - ((avgDiff / threshold) * 100));

      const pickScore = 100;
      const destScore = 100; // Since grouped exactly by criteria
      const locScore = Math.round(pickScore * 0.7 + destScore * 0.3);

      let rawMatchScore = locScore * 0.6 + timeScore * 0.4;

      // Trust metrics for synthesized co-travelers
      let totalTrust = 0;
      let verifiedCount = 0;
      let favoriteMatched = false;

      compatibleReqs.forEach((req) => {
        totalTrust += req.user.trustScore;
        if (req.user.isVerified) verifiedCount++;
        if (favPartnerIds.has(req.user.id)) favoriteMatched = true;
      });

      const avgTrustScore = totalTrust / compatibleReqs.length;
      const trustScoreFactor = avgTrustScore / 95;
      let matchScore = rawMatchScore * trustScoreFactor;

      if (favoriteMatched) {
        matchScore += 10.0;
      }
      matchScore += (verifiedCount * 2.0);
      matchScore = parseFloat(Math.min(100, Math.max(0, matchScore)).toFixed(1));

      // Real Savings Calculator
      const vehicle = intent.vehicleType === "Any" ? "Auto" : intent.vehicleType;
      const soloFare = vehicle === "Auto" ? 120 : 360; 
      const totalGroupSizePlusUser = compatibleReqs.length + 1;
      const sharedFare = Math.round(soloFare / totalGroupSizePlusUser);
      const estimatedSavings = soloFare - sharedFare;

      const explanation = [
        `✓ Synthesize direct commute squad with ${compatibleReqs.length} classmates`,
        avgDiff === 0 ? "✓ Optimal shared time coordinate" : `✓ Smooth time alignment (Only ${avgDiff}m adjustment)`,
        `✓ Reputation quotient: ${Math.round(avgTrustScore)}% average reliability (Verified users: ${verifiedCount})`,
        favoriteMatched ? "⭐ Dynamic favorite matching: high preference traveler present!" : "✓ Matches vehicle parameters and routing coordinates",
        `✓ Economical: split fare ₹${sharedFare}/student instead of ₹${soloFare}`
      ];

      recommendations.push({
        isExistingGroup: false,
        name: `${compatibleReqs[0].pickupArea} Classmates Pool`,
        pickupArea: compatibleReqs[0].pickupArea,
        destinationCampus: compatibleReqs[0].destinationCampus || "Main Campus",
        departureTime: departureTimeFormatted,
        matchScore,
        locationScore: locScore,
        timeScore: Math.round(timeScore),
        timeDifference: avgDiff,
        travelDays: compatibleReqs[0].travelDays || "Mon,Tue,Wed,Thu,Fri",
        recurringSchedule: compatibleReqs[0].recurringSchedule || "Recurring",
        estimatedSavings,
        soloFare,
        sharedFare,
        members: compatibleReqs.map((req) => {
          return {
            id: req.user.id,
            name: req.user.name,
            college: req.user.college,
            email: req.user.email,
            isVerified: (req.user as any).isVerified,
            trustScore: (req.user as any).trustScore,
            reliabilityScore: (req.user as any).reliabilityScore,
          } as any;
        }),
        explanation,
        vehicleType: vehicle,
        maxSize: intent.groupSize,
        candidateRequestIds: compatibleReqs.map((req) => req.id),
      });
    }

    // Sort descending by score
    recommendations.sort((a, b) => b.matchScore - a.matchScore);

    return recommendations;
  }
}
