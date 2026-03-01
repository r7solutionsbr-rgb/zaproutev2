-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "driverType" TEXT NOT NULL DEFAULT 'OWN';

-- CreateIndex
CREATE INDEX "drivers_driverType_idx" ON "drivers"("driverType");
