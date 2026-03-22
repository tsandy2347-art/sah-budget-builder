-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable: add role and approved columns with defaults
ALTER TABLE "User" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "approved" BOOLEAN NOT NULL DEFAULT false;

-- Set all existing users as approved admins (they had access before this feature)
UPDATE "User" SET "role" = 'ADMIN', "approved" = true;
