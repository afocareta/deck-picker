-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "assignedOfficeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_assignedOfficeId_fkey" FOREIGN KEY ("assignedOfficeId") REFERENCES "Office" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "floorNum" INTEGER NOT NULL,
    "floorName" TEXT NOT NULL,
    "floorMap" TEXT NOT NULL,
    CONSTRAINT "Floor_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Desk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorId" TEXT NOT NULL,
    "deskNum" INTEGER NOT NULL,
    "deskName" TEXT NOT NULL,
    CONSTRAINT "Desk_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deskId" TEXT NOT NULL,
    "seatNum" INTEGER NOT NULL,
    CONSTRAINT "Seat_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "Desk" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "seatId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reservation_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Office_code_key" ON "Office"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Floor_officeId_floorNum_key" ON "Floor"("officeId", "floorNum");

-- CreateIndex
CREATE UNIQUE INDEX "Desk_floorId_deskNum_key" ON "Desk"("floorId", "deskNum");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_deskId_seatNum_key" ON "Seat"("deskId", "seatNum");

-- CreateIndex
CREATE INDEX "Reservation_date_status_idx" ON "Reservation"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_seatId_date_status_key" ON "Reservation"("seatId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_userId_date_status_key" ON "Reservation"("userId", "date", "status");
