CREATE TABLE "LogoSetting" (
  "id" TEXT NOT NULL DEFAULT 'store',
  "image" BYTEA NOT NULL,
  "mimeType" VARCHAR(32) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LogoSetting_pkey" PRIMARY KEY ("id")
);
