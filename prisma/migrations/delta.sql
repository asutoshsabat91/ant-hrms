-- Delta migration: add new enums, columns, and tables for POSH, Separation, Procurement, WFH

-- 1. New enums
DO $$ BEGIN
  CREATE TYPE "ReimbursementType" AS ENUM ('REIMBURSEMENT', 'PROCUREMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SeparationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Extend NotificationType enum with new values
DO $$ BEGIN
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REIMBURSEMENT_UPDATE';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PROCUREMENT_UPDATE';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SEPARATION_REQUEST';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'SEPARATION_UPDATE';
  ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'POSH_REPORT';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Add new columns to Reimbursement
ALTER TABLE "Reimbursement"
  ADD COLUMN IF NOT EXISTS "type" "ReimbursementType" NOT NULL DEFAULT 'REIMBURSEMENT',
  ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

-- 4. Create POSHReport table
CREATE TABLE IF NOT EXISTS "POSHReport" (
  "id"          TEXT NOT NULL,
  "employeeId"  TEXT NOT NULL,
  "subject"     TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "POSHReport_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "POSHReport"
    ADD CONSTRAINT "POSHReport_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create Separation table
CREATE TABLE IF NOT EXISTS "Separation" (
  "id"              TEXT NOT NULL,
  "employeeId"      TEXT NOT NULL,
  "status"          "SeparationStatus" NOT NULL DEFAULT 'PENDING',
  "reason"          TEXT NOT NULL,
  "noticeDays"      INTEGER NOT NULL DEFAULT 10,
  "initiatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt"      TIMESTAMP(3),
  "lastWorkingDate" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Separation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Separation_employeeId_key" ON "Separation"("employeeId");

DO $$ BEGIN
  ALTER TABLE "Separation"
    ADD CONSTRAINT "Separation_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
