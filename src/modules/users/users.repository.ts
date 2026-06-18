// src/modules/users/users.repository.ts
import { prisma } from "../../config/db.ts";

export class UsersRepository {
  async findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        college: true,
        email: true,
        homeLocation: true,
        isVerified: true,
        collegeEmail: true,
        createdAt: true,
        trustScores: true,
      }
    });
  }

  async updateProfile(id: string, data: { name?: string; college?: string; homeLocation?: string; isVerified?: boolean; collegeEmail?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        college: true,
        email: true,
        homeLocation: true,
        isVerified: true,
        collegeEmail: true,
        createdAt: true,
        trustScores: true,
      }
    });
  }

  async deleteUser(id: string) {
    return prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  }
}
