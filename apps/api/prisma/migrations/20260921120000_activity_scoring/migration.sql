-- AlterTable
ALTER TABLE "Bin" RENAME COLUMN "factorRecentMovement" TO "factorActivity";
ALTER TABLE "Bin" ADD COLUMN "factorAdjustment" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Bin" ADD COLUMN "factorFailedAudit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Bin" ADD COLUMN "lastAuditResult" "AuditPassFail";
