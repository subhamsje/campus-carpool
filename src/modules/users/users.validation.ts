// src/modules/users/users.validation.ts
import { z } from "zod";

export const UpdateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  college: z.string().min(2, "College must be at least 2 characters").optional(),
  homeLocation: z.string().min(2, "Home location is required").optional(),
});
