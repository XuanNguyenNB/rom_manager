CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TYPE "FileType" AS ENUM ('ROM', 'TOOL', 'DRIVER', 'PATCH', 'GUIDE', 'BUNDLE', 'OTHER');
CREATE TYPE "FileStatus" AS ENUM ('UNCLASSIFIED', 'TESTED', 'UNTESTED', 'BAD', 'ARCHIVED', 'MISSING');
CREATE TYPE "ScriptLanguage" AS ENUM ('VI', 'EN');
CREATE TYPE "ScriptStage" AS ENUM ('QUOTE', 'WARNING', 'BACKUP', 'DOWNLOADING', 'ERROR', 'DONE', 'SUPPORT', 'OTHER');
CREATE TYPE "DownloadLinkKind" AS ENUM ('FILE', 'PACKAGE');
CREATE TYPE "AuditAction" AS ENUM ('FILE_SCAN', 'LINK_CREATED', 'LINK_REVOKED', 'LINK_DOWNLOADED', 'SAFE_CREATED', 'SAFE_LOGIN', 'SCRIPT_IMPORTED', 'METADATA_UPDATED');

CREATE TABLE "Device" (
  "id" TEXT NOT NULL,
  "brand" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "codename" TEXT,
  "chipset" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RomFile" (
  "id" TEXT NOT NULL,
  "alistPath" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "sizeBytes" BIGINT,
  "modifiedAt" TIMESTAMP(3),
  "brand" TEXT,
  "model" TEXT,
  "deviceId" TEXT,
  "region" TEXT,
  "androidVersion" TEXT,
  "buildNumber" TEXT,
  "fileType" "FileType" NOT NULL DEFAULT 'OTHER',
  "status" "FileStatus" NOT NULL DEFAULT 'UNCLASSIFIED',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "note" TEXT,
  "checksum" TEXT,
  "missingAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RomFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScriptTemplate" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "language" "ScriptLanguage" NOT NULL DEFAULT 'VI',
  "brand" TEXT,
  "model" TEXT,
  "deviceId" TEXT,
  "stage" "ScriptStage" NOT NULL DEFAULT 'OTHER',
  "body" TEXT NOT NULL,
  "variables" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScriptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadLink" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "kind" "DownloadLinkKind" NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DownloadLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DownloadLinkFile" (
  "linkId" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "DownloadLinkFile_pkey" PRIMARY KEY ("linkId", "fileId")
);

CREATE TABLE "SafeSession" (
  "id" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "tokenHash" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3),
  "createdBy" TEXT,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SafeSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "actorType" TEXT NOT NULL,
  "actorEmail" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "linkId" TEXT,
  "ip" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Device_brand_model_key" ON "Device"("brand", "model");
CREATE INDEX "Device_brand_idx" ON "Device"("brand");
CREATE UNIQUE INDEX "RomFile_alistPath_key" ON "RomFile"("alistPath");
CREATE INDEX "RomFile_brand_model_idx" ON "RomFile"("brand", "model");
CREATE INDEX "RomFile_fileType_idx" ON "RomFile"("fileType");
CREATE INDEX "RomFile_status_idx" ON "RomFile"("status");
CREATE INDEX "RomFile_filename_trgm_idx" ON "RomFile" USING GIN ("filename" gin_trgm_ops);
CREATE INDEX "RomFile_alistPath_trgm_idx" ON "RomFile" USING GIN ("alistPath" gin_trgm_ops);
CREATE INDEX "RomFile_tags_idx" ON "RomFile" USING GIN ("tags");
CREATE INDEX "ScriptTemplate_brand_model_idx" ON "ScriptTemplate"("brand", "model");
CREATE INDEX "ScriptTemplate_language_idx" ON "ScriptTemplate"("language");
CREATE INDEX "ScriptTemplate_stage_idx" ON "ScriptTemplate"("stage");
CREATE INDEX "ScriptTemplate_title_trgm_idx" ON "ScriptTemplate" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "ScriptTemplate_body_trgm_idx" ON "ScriptTemplate" USING GIN ("body" gin_trgm_ops);
CREATE INDEX "ScriptTemplate_tags_idx" ON "ScriptTemplate" USING GIN ("tags");
CREATE UNIQUE INDEX "DownloadLink_tokenHash_key" ON "DownloadLink"("tokenHash");
CREATE INDEX "DownloadLink_expiresAt_idx" ON "DownloadLink"("expiresAt");
CREATE INDEX "DownloadLink_revokedAt_idx" ON "DownloadLink"("revokedAt");
CREATE INDEX "DownloadLinkFile_fileId_idx" ON "DownloadLinkFile"("fileId");
CREATE UNIQUE INDEX "SafeSession_codeHash_key" ON "SafeSession"("codeHash");
CREATE UNIQUE INDEX "SafeSession_tokenHash_key" ON "SafeSession"("tokenHash");
CREATE INDEX "SafeSession_expiresAt_idx" ON "SafeSession"("expiresAt");
CREATE INDEX "SafeSession_revokedAt_idx" ON "SafeSession"("revokedAt");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

ALTER TABLE "RomFile" ADD CONSTRAINT "RomFile_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScriptTemplate" ADD CONSTRAINT "ScriptTemplate_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DownloadLinkFile" ADD CONSTRAINT "DownloadLinkFile_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DownloadLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DownloadLinkFile" ADD CONSTRAINT "DownloadLinkFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "RomFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "DownloadLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
