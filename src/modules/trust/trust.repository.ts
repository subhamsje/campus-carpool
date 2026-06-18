// src/modules/trust/trust.repository.ts
import { prisma } from "../../config/db.ts";

export class TrustRepository {
  async getTrustScore(userId: string) {
    let score = await prisma.trustScore.findFirst({
      where: { userId }
    });

    if (!score) {
      score = await prisma.trustScore.create({
        data: {
          userId,
          score: 100,
          metrics: JSON.stringify({ completionRate: 100, cancellationRate: 0 })
        }
      });
    }

    return score;
  }
}
