-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "carrierId" TEXT;

-- CreateTable
CREATE TABLE "carriers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carriers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "carriers_tenantId_idx" ON "carriers"("tenantId");

-- CreateIndex
CREATE INDEX "carriers_phone_idx" ON "carriers"("phone");

-- CreateIndex
CREATE INDEX "deliveries_carrierId_idx" ON "deliveries"("carrierId");

-- AddForeignKey
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "carriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
