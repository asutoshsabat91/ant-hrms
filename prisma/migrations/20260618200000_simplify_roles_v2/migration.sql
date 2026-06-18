-- Migration: simplify_roles_v2

-- ── Step 1: Role enum ──────────────────────────────────────────
CREATE TYPE "Role_new" AS ENUM ('ADMIN', 'EMPLOYEE');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "Role_new"
  USING (
    CASE "role"::text
      WHEN 'SUPER_ADMIN' THEN 'ADMIN'
      WHEN 'HR_ADMIN'    THEN 'ADMIN'
      WHEN 'MANAGER'     THEN 'EMPLOYEE'
      WHEN 'EMPLOYEE'    THEN 'EMPLOYEE'
      WHEN 'INTERN'      THEN 'EMPLOYEE'
      ELSE 'EMPLOYEE'
    END
  )::"Role_new";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE'::"Role_new";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

-- ── Step 2: NotificationType enum ─────────────────────────────
-- Cast to text first to avoid type mismatch in UPDATE
UPDATE "Notification"
  SET type = 'SYSTEM'::"NotificationType"
  WHERE type = 'GRIEVANCE_UPDATE'::"NotificationType";

CREATE TYPE "NotificationType_new" AS ENUM (
  'ONBOARDING_TASK', 'LEAVE_REQUEST', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
  'PAYSLIP_READY', 'DOCUMENT_READY', 'ATTENDANCE_ALERT', 'BIRTHDAY',
  'WORK_ANNIVERSARY', 'REIMBURSEMENT_UPDATE', 'PROCUREMENT_UPDATE',
  'SEPARATION_REQUEST', 'SEPARATION_UPDATE', 'POSH_REPORT',
  'ATTENDANCE_REGULARIZATION', 'SYSTEM'
);

ALTER TABLE "Notification" ALTER COLUMN "type" DROP DEFAULT;

ALTER TABLE "Notification"
  ALTER COLUMN "type" TYPE "NotificationType_new"
  USING ("type"::text::"NotificationType_new");

DROP TYPE "NotificationType";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";

-- ── Step 3: Drop IT Ops ───────────────────────────────────────
DROP TABLE IF EXISTS "ITTask";
DROP TYPE IF EXISTS "ITTaskType";
DROP TYPE IF EXISTS "ITTaskStatus";

-- ── Step 4: Drop Grievances ───────────────────────────────────
DROP TABLE IF EXISTS "GrievanceComment";
DROP TABLE IF EXISTS "Grievance";
DROP TYPE IF EXISTS "GrievanceStatus";
DROP TYPE IF EXISTS "GrievancePriority";

-- ── Step 5: AttendancePunch assumed fields ────────────────────
ALTER TABLE "AttendancePunch" ADD COLUMN IF NOT EXISTS "isAssumed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AttendancePunch" ADD COLUMN IF NOT EXISTS "assumedReason" TEXT;
