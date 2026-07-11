-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('provisioning', 'active', 'suspended');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "logo" TEXT,
    "databaseName" TEXT NOT NULL,
    "status" "SchoolStatus" NOT NULL DEFAULT 'provisioning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_databaseName_key" ON "School"("databaseName");
