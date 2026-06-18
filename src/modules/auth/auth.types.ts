// src/modules/auth/auth.types.ts

export interface JWTPayload {
  userId: string;
  email: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    college: string;
    email: string;
    homeLocation: string;
  };
  accessToken: string;
  refreshToken: string;
}
