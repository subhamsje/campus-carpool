-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "college" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "homeLocation" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "collegeEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "RideRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pickupArea" TEXT NOT NULL,
    "destinationCampus" TEXT NOT NULL,
    "departureTime" DATETIME NOT NULL,
    "flexibility" INTEGER NOT NULL DEFAULT 30,
    "vehicleType" TEXT NOT NULL DEFAULT 'Any',
    "groupSize" INTEGER NOT NULL DEFAULT 3,
    "travelDays" TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    "recurringSchedule" TEXT NOT NULL DEFAULT 'Recurring',
    "status" TEXT NOT NULL DEFAULT 'SEARCHING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "groupId" TEXT,
    CONSTRAINT "RideRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RideRequest_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RideGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RideGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pickupArea" TEXT NOT NULL,
    "destinationCampus" TEXT NOT NULL,
    "departureTime" DATETIME NOT NULL,
    "matchScore" REAL NOT NULL DEFAULT 0.0,
    "travelDays" TEXT NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
    "recurringSchedule" TEXT NOT NULL DEFAULT 'Recurring',
    "status" TEXT NOT NULL DEFAULT 'FORMING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "RideGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "RideGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RideGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RideGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommuteSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "daysOfWeek" TEXT NOT NULL,
    "pickupArea" TEXT NOT NULL,
    "destinationCampus" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "CommuteSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrustScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 100,
    "metrics" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrustScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteCommunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pickupArea" TEXT NOT NULL,
    "destinationCampus" TEXT NOT NULL,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "activeDemand" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventName" TEXT NOT NULL,
    "eventData" TEXT NOT NULL,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "groupId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Waitlist_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "RideRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Waitlist_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RideGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "RideRequest_userId_idx" ON "RideRequest"("userId");

-- CreateIndex
CREATE INDEX "RideRequest_pickupArea_destinationCampus_idx" ON "RideRequest"("pickupArea", "destinationCampus");

-- CreateIndex
CREATE INDEX "RideGroup_pickupArea_destinationCampus_idx" ON "RideGroup"("pickupArea", "destinationCampus");

-- CreateIndex
CREATE INDEX "RideGroupMember_userId_idx" ON "RideGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RideGroupMember_groupId_userId_key" ON "RideGroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "CommuteSchedule_userId_idx" ON "CommuteSchedule"("userId");

-- CreateIndex
CREATE INDEX "TrustScore_userId_idx" ON "TrustScore"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RouteCommunity_pickupArea_destinationCampus_key" ON "RouteCommunity"("pickupArea", "destinationCampus");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_idx" ON "AnalyticsEvent"("eventName");

-- CreateIndex
CREATE INDEX "Waitlist_userId_idx" ON "Waitlist"("userId");

-- CreateIndex
CREATE INDEX "Waitlist_groupId_idx" ON "Waitlist"("groupId");
