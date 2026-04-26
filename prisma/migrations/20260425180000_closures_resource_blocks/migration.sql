-- CreateTable
CREATE TABLE "OfficeClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeClosure_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResourceBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "floorId" TEXT,
    "deskId" TEXT,
    "seatId" TEXT,
    "date" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceBlock_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "Desk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OfficeClosure_officeId_date_key" ON "OfficeClosure"("officeId", "date");

-- CreateIndex
CREATE INDEX "OfficeClosure_date_idx" ON "OfficeClosure"("date");

-- CreateIndex
CREATE INDEX "ResourceBlock_officeId_date_idx" ON "ResourceBlock"("officeId", "date");

-- CreateIndex
CREATE INDEX "ResourceBlock_floorId_date_idx" ON "ResourceBlock"("floorId", "date");

-- CreateIndex
CREATE INDEX "ResourceBlock_deskId_date_idx" ON "ResourceBlock"("deskId", "date");

-- CreateIndex
CREATE INDEX "ResourceBlock_seatId_date_idx" ON "ResourceBlock"("seatId", "date");
