PRAGMA foreign_keys=OFF;

CREATE TABLE "new_OfficeClosure" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfficeClosure_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_OfficeClosure" ("id", "officeId", "startDate", "endDate", "reason", "createdAt")
SELECT "id", "officeId", "date", "date", "reason", "createdAt"
FROM "OfficeClosure";

DROP TABLE "OfficeClosure";
ALTER TABLE "new_OfficeClosure" RENAME TO "OfficeClosure";

CREATE INDEX "OfficeClosure_officeId_startDate_endDate_idx" ON "OfficeClosure"("officeId", "startDate", "endDate");
CREATE INDEX "OfficeClosure_startDate_endDate_idx" ON "OfficeClosure"("startDate", "endDate");

CREATE TABLE "new_ResourceBlock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "officeId" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "floorId" TEXT,
    "deskId" TEXT,
    "seatId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResourceBlock_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_deskId_fkey" FOREIGN KEY ("deskId") REFERENCES "Desk" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ResourceBlock_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_ResourceBlock" (
    "id",
    "officeId",
    "blockType",
    "floorId",
    "deskId",
    "seatId",
    "startDate",
    "endDate",
    "reason",
    "createdAt"
)
SELECT
    "id",
    "officeId",
    "blockType",
    "floorId",
    "deskId",
    "seatId",
    "date",
    "date",
    "reason",
    "createdAt"
FROM "ResourceBlock";

DROP TABLE "ResourceBlock";
ALTER TABLE "new_ResourceBlock" RENAME TO "ResourceBlock";

CREATE INDEX "ResourceBlock_officeId_startDate_endDate_idx" ON "ResourceBlock"("officeId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_floorId_startDate_endDate_idx" ON "ResourceBlock"("floorId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_deskId_startDate_endDate_idx" ON "ResourceBlock"("deskId", "startDate", "endDate");
CREATE INDEX "ResourceBlock_seatId_startDate_endDate_idx" ON "ResourceBlock"("seatId", "startDate", "endDate");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
