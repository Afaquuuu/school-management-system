-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantStorage" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantStorage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantStorage_schoolId_idx" ON "TenantStorage"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "TenantStorage_schoolId_key_key" ON "TenantStorage"("schoolId", "key");

-- AddForeignKey
ALTER TABLE "TenantStorage" ADD CONSTRAINT "TenantStorage_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
