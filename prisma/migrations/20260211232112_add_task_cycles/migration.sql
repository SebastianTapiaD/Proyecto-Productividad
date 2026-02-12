-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "cycleInDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastCompletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
