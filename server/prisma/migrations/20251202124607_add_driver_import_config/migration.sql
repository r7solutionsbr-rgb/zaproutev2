-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "config" JSONB DEFAULT '{}';
