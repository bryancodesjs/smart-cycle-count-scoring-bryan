-- AlterTable
ALTER TABLE "Bin" ADD COLUMN "factorDaysSinceChecked" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Bin" ADD COLUMN "factorRecentMovement" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Bin" ADD COLUMN "factorOccupancy" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Bin_code_idx" ON "Bin"("code");

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('PUTAWAY', 'PICK', 'ADJUST', 'MOVE');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "AuditPassFail" AS ENUM ('PASS', 'FAIL');

-- CreateTable
CREATE TABLE "InventoryActivity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "binId" TEXT NOT NULL,
    "palletId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditPlan" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "topN" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditTask" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "binId" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "riskScoreAtCreate" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "expectedQuantity" INTEGER,
    "countedQuantity" INTEGER,
    "result" "AuditPassFail",
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AuditTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryActivity_binId_idx" ON "InventoryActivity"("binId");

-- CreateIndex
CREATE INDEX "InventoryActivity_createdAt_idx" ON "InventoryActivity"("createdAt");

-- CreateIndex
CREATE INDEX "AuditPlan_warehouseId_idx" ON "AuditPlan"("warehouseId");

-- CreateIndex
CREATE INDEX "AuditTask_planId_idx" ON "AuditTask"("planId");

-- CreateIndex
CREATE INDEX "AuditTask_binId_idx" ON "AuditTask"("binId");

-- CreateIndex
CREATE INDEX "AuditTask_status_idx" ON "AuditTask"("status");

-- AddForeignKey
ALTER TABLE "InventoryActivity" ADD CONSTRAINT "InventoryActivity_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditPlan" ADD CONSTRAINT "AuditPlan_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTask" ADD CONSTRAINT "AuditTask_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AuditPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTask" ADD CONSTRAINT "AuditTask_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
