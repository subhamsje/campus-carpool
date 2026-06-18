// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AuthRepository } from "./auth.repository.ts";
import { JWTPayload, AuthResponse } from "./auth.types.ts";

const JWT_SECRET = process.env.JWT_SECRET || "campuspool-jwt-access-secret-key-2026";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "campuspool-jwt-refresh-secret-key-2026";

export class AuthService {
  private repository = new AuthRepository();

  async register(data: any): Promise<AuthResponse> {
    const existing = await this.repository.findUserByEmail(data.email);
    if (existing) {
      throw new Error("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.repository.createUser({
      name: data.name,
      college: data.college,
      email: data.email,
      passwordHash,
      homeLocation: data.homeLocation,
    });

    return this.generateAuthResult(user);
  }

  async login(data: any): Promise<AuthResponse> {
    const user = await this.repository.findUserByEmail(data.email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    return this.generateAuthResult(user);
  }

  async refresh(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    const stored = await this.repository.findRefreshToken(token);
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.repository.deleteRefreshToken(token);
      }
      throw new Error("Refresh token expired or invalid");
    }

    try {
      jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      throw new Error("Refresh token signature invalid");
    }

    // Generate new access token and rotating refresh token
    const payload: JWTPayload = { userId: stored.userId, email: stored.user.email };
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // Invalidate old and save new
    await this.repository.deleteRefreshToken(token);
    await this.repository.saveRefreshToken(
      stored.userId,
      newRefreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(token: string): Promise<void> {
    await this.repository.deleteRefreshToken(token);
  }

  private async generateAuthResult(user: any): Promise<AuthResponse> {
    const payload: JWTPayload = { userId: user.id, email: user.email };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

    // Store refresh token in SQLite
    await this.repository.saveRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        college: user.college,
        email: user.email,
        homeLocation: user.homeLocation,
      },
      accessToken,
      refreshToken,
    };
  }
}
