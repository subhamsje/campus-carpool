// src/modules/trust/trust.service.ts
import { TrustRepository } from "./trust.repository.ts";

export class TrustService {
  private repository = new TrustRepository();

  async getUserTrustScore(userId: string) {
    return this.repository.getTrustScore(userId);
  }
}
