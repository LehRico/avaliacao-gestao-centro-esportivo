-- CreateEnum
CREATE TYPE "CourtStatus" AS ENUM ('ATIVA', 'EM_MANUTENCAO', 'INATIVA');

-- AlterTable
ALTER TABLE "courts" ADD COLUMN     "status" "CourtStatus" NOT NULL DEFAULT 'ATIVA';
