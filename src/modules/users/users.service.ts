// src/modules/users/users.service.ts
import { UsersRepository } from "./users.repository.ts";

export class UsersService {
  private repository = new UsersRepository();

  async getProfile(userId: string) {
    const user = await this.repository.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }
    return user;
  }

  async updateProfile(userId: string, data: any) {
    return this.repository.updateProfile(userId, {
      name: data.name,
      college: data.college,
      homeLocation: data.homeLocation
    });
  }
}
