-- DropForeignKey
ALTER TABLE "matches" DROP CONSTRAINT "matches_courtId_fkey";

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "courtName" TEXT,
ALTER COLUMN "courtId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courts_name_key" ON "courts"("name");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_courtId_fkey" FOREIGN KEY ("courtId") REFERENCES "courts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
