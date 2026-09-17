-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aisleCount" INTEGER NOT NULL,
    "racksPerAisle" INTEGER NOT NULL,
    "binsPerRack" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aisle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "aisleIndex" INTEGER NOT NULL,
    "warehouseId" TEXT NOT NULL,

    CONSTRAINT "Aisle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rack" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "aisleIndex" INTEGER NOT NULL,
    "rackIndex" INTEGER NOT NULL,
    "aisleId" TEXT NOT NULL,

    CONSTRAINT "Rack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "aisleIndex" INTEGER NOT NULL,
    "rackIndex" INTEGER NOT NULL,
    "binIndex" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rackId" TEXT NOT NULL,

    CONSTRAINT "Bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pallet" (
    "id" TEXT NOT NULL,
    "skuLabel" TEXT NOT NULL,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "binId" TEXT NOT NULL,

    CONSTRAINT "Pallet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Aisle_warehouseId_idx" ON "Aisle"("warehouseId");

-- CreateIndex
CREATE INDEX "Rack_aisleId_idx" ON "Rack"("aisleId");

-- CreateIndex
CREATE INDEX "Bin_rackId_idx" ON "Bin"("rackId");

-- CreateIndex
CREATE INDEX "Bin_riskScore_idx" ON "Bin"("riskScore");

-- CreateIndex
CREATE INDEX "Pallet_binId_idx" ON "Pallet"("binId");

-- AddForeignKey
ALTER TABLE "Aisle" ADD CONSTRAINT "Aisle_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rack" ADD CONSTRAINT "Rack_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bin" ADD CONSTRAINT "Bin_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "Rack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pallet" ADD CONSTRAINT "Pallet_binId_fkey" FOREIGN KEY ("binId") REFERENCES "Bin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
