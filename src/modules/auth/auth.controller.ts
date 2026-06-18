// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { AuthService } from "./auth.service.ts";
import { RegisterSchema, LoginSchema, RefreshTokenSchema } from "./auth.validation.ts";

export class AuthController {
  private service = new AuthService();

  register = async (req: Request, res: Response) => {
    try {
      const validated = RegisterSchema.parse(req.body);
      const result = await this.service.register(validated);
      res.status(210).json({ success: true, ...result }); // 210 stands for standard success response
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
      } else {
        res.status(400).json({ success: false, message: error.message || "Registration failed" });
      }
    }
  };

  login = async (req: Request, res: Response) => {
    try {
      const validated = LoginSchema.parse(req.body);
      const result = await this.service.login(validated);
      res.status(200).json({ success: true, ...result });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ success: false, message: "Validation failed", errors: error.errors });
      } else {
        res.status(401).json({ success: false, message: error.message || "Invalid email or password" });
      }
    }
  };

  refresh = async (req: Request, res: Response) => {
    try {
      const validated = RefreshTokenSchema.parse(req.body);
      const tokens = await this.service.refresh(validated.refreshToken);
      res.status(200).json({ success: true, ...tokens });
    } catch (error: any) {
      if (error.name === "ZodError") {
        res.status(400).json({ success: false, errors: error.errors });
      } else {
        res.status(401).json({ success: false, message: error.message });
      }
    }
  };

  logout = async (req: Request, res: Response) => {
    try {
      const token = req.body.refreshToken;
      if (token) {
        await this.service.logout(token);
      }
      res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  };
}
