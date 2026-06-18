import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Supabase PostgreSQL Seed...');

  // 1. Clean existing
  await prisma.refreshToken.deleteMany();
  await prisma.savedRoute.deleteMany();
  await prisma.favoritePartner.deleteMany();
  await prisma.groupChatMessage.deleteMany();
  await prisma.waitlistNotification.deleteMany();
  await prisma.analyticsRecord.deleteMany();
  await prisma.waitlist.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.routeCommunity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.trustScore.deleteMany();
  await prisma.commuteSchedule.deleteMany();
  await prisma.rideGroupMember.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.rideGroup.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('password123', 10);

  // 2. Generate 100 Students (Users & Trust Scores)
  console.log('Generating 100 students...');
  
  // Add a known test user first
  const testUser = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'test@college.edu',
      college: 'Main Campus',
      passwordHash: passwordHash,
      homeLocation: 'Salt Lake, Sector V',
      isVerified: true,
      collegeEmail: 'test@college.edu',
      trustScores: {
        create: {
          score: 100,
          metrics: JSON.stringify({ cancellationRate: 0, completionRate: 100 })
        }
      }
    }
  });

  const users = [testUser];
  for (let i = 0; i < 99; i++) {
    const user = await prisma.user.create({
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        college: faker.helpers.arrayElement(['Main Campus', 'Engineering Dept', 'Science Block']),
        passwordHash: passwordHash,
        homeLocation: faker.location.streetAddress(),
        isVerified: true,
        collegeEmail: faker.internet.email({ provider: 'edu.in' }),
        trustScores: {
          create: {
            score: faker.number.int({ min: 80, max: 100 }),
            metrics: JSON.stringify({
              cancellationRate: faker.number.float({ min: 0, max: 5 }),
              completionRate: faker.number.int({ min: 80, max: 100 })
            })
          }
        }
      }
    });
    users.push(user);
  }

  // 3. Generate 100 Groups
  console.log('Generating 100 groups...');
  const groups = [];
  const locations = ['Salt Lake', 'Sector V', 'New Town', 'Rajarhat', 'Airport'];
  for (let i = 0; i < 100; i++) {
    const group = await prisma.rideGroup.create({
      data: {
        pickupArea: faker.helpers.arrayElement(locations),
        destinationCampus: 'Main Campus',
        departureTime: faker.date.soon({ days: 5 }),
        matchScore: faker.number.float({ min: 70, max: 100, fractionDigits: 1 }),
        status: faker.helpers.arrayElement(['FORMING', 'LOCKED'])
      }
    });
    groups.push(group);
  }

  // 4. Generate 500 Ride Requests & Memberships
  console.log('Generating 500 ride requests & waitlists...');
  const memberships = new Set<string>();

  for (let i = 0; i < 500; i++) {
    const user = faker.helpers.arrayElement(users);
    const group = faker.helpers.arrayElement(groups);
    const isMatched = Math.random() > 0.5;

    const request = await prisma.rideRequest.create({
      data: {
        userId: user.id,
        pickupArea: group.pickupArea,
        destinationCampus: group.destinationCampus,
        departureTime: faker.date.soon({ days: 5 }),
        status: isMatched ? 'MATCHED' : 'SEARCHING',
        groupId: isMatched ? group.id : null,
      }
    });

    const membershipKey = `${group.id}-${user.id}`;
    if (isMatched && !memberships.has(membershipKey)) {
      // Create membership
      await prisma.rideGroupMember.create({
        data: {
          groupId: group.id,
          userId: user.id
        }
      });
      memberships.add(membershipKey);
    } else if (!isMatched) {
      // Put in waitlist
      await prisma.waitlist.create({
        data: {
          userId: user.id,
          requestId: request.id,
          groupId: group.id
        }
      });
    }
  }

  // 5. Generate Route Communities
  console.log('Generating Route Communities...');
  for (const loc of locations) {
    await prisma.routeCommunity.create({
      data: {
        pickupArea: loc,
        destinationCampus: 'Main Campus',
        memberCount: faker.number.int({ min: 10, max: 100 }),
        activeDemand: faker.number.int({ min: 5, max: 30 })
      }
    });
  }

  // 6. Analytics Events
  console.log('Generating Analytics...');
  for (let i = 0; i < 50; i++) {
    await prisma.analyticsEvent.create({
      data: {
        eventName: 'RIDE_COMPLETED',
        eventData: JSON.stringify({ savings: faker.number.int({ min: 50, max: 200 }), carbon: faker.number.int({ min: 1, max: 5 }) })
      }
    });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
