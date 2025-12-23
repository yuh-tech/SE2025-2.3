-- CreateTable
CREATE TABLE "OidcAdapter" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "grantId" TEXT,
    "userCode" TEXT,
    "uid" TEXT,
    "expiresAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OidcAdapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OidcAdapter_userCode_key" ON "OidcAdapter"("userCode");

-- CreateIndex
CREATE UNIQUE INDEX "OidcAdapter_uid_key" ON "OidcAdapter"("uid");

-- CreateIndex
CREATE INDEX "OidcAdapter_grantId_idx" ON "OidcAdapter"("grantId");

-- CreateIndex
CREATE INDEX "OidcAdapter_expiresAt_idx" ON "OidcAdapter"("expiresAt");
