-- CreateTable
CREATE TABLE "FileStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "policyAcceptedAt" DATETIME,
    "lastSeenAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "deadManSwitchDays" INTEGER,
    "deadManTriggerAction" TEXT DEFAULT 'LOCKDOWN'
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GuestEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "policyAcceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "GuestAccessLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "loginAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionMins" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "TrashItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "originalPath" TEXT NOT NULL,
    "deletedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "size" INTEGER NOT NULL,
    "mtime" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SharedLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "folder" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "maxViews" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ForensicInvestigation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "aiReport" TEXT,
    "sha256Hash" TEXT NOT NULL,
    "operatorEmail" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OsintKeyword" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "legalRef" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OsintScheduledScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keywordId" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "rawOutput" TEXT NOT NULL,
    "aiReport" TEXT,
    "sha256Hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorMessage" TEXT,
    "durationSecs" REAL,
    "triggeredBy" TEXT NOT NULL DEFAULT 'cron',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OsintScheduledScan_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "OsintKeyword" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MoltbotConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "geminiKey" TEXT,
    "dailyQuotaBRL" REAL NOT NULL DEFAULT 10.0,
    "currentUsageBRL" REAL NOT NULL DEFAULT 0.0,
    "activeMode" TEXT NOT NULL DEFAULT 'HYBRID',
    "lastScanAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MoltbotLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "logText" TEXT NOT NULL,
    "screenshotPath" TEXT,
    "sha256Hash" TEXT NOT NULL,
    "costBRL" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "InvestigationTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "FileStatus_folder_filename_key" ON "FileStatus"("folder", "filename");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "GuestEmail_email_key" ON "GuestEmail"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SharedLink_token_key" ON "SharedLink"("token");

-- CreateIndex
CREATE UNIQUE INDEX "OsintKeyword_keyword_key" ON "OsintKeyword"("keyword");

-- CreateIndex
CREATE UNIQUE INDEX "InvestigationTarget_url_key" ON "InvestigationTarget"("url");
