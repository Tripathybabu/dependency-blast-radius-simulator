-- CreateEnum
CREATE TYPE "Criticality" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('healthy', 'degraded', 'failed');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('running', 'completed');

-- CreateEnum
CREATE TYPE "ImpactType" AS ENUM ('direct', 'indirect');

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner" TEXT,
    "criticality" "Criticality" NOT NULL DEFAULT 'medium',
    "status" "ServiceStatus" NOT NULL DEFAULT 'healthy',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependencies" (
    "id" TEXT NOT NULL,
    "sourceServiceId" TEXT NOT NULL,
    "targetServiceId" TEXT NOT NULL,
    "dependencyType" TEXT DEFAULT 'hard',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "failedServiceIds" TEXT[],
    "blastRadius" JSONB,
    "severityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impactedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "SimulationStatus" NOT NULL DEFAULT 'completed',
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_results" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "affectedServiceId" TEXT NOT NULL,
    "impactType" "ImpactType" NOT NULL,
    "depth" INTEGER NOT NULL,
    "dependencyPath" TEXT[],
    "severityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "simulation_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dependencies_sourceServiceId_targetServiceId_key" ON "dependencies"("sourceServiceId", "targetServiceId");

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_sourceServiceId_fkey" FOREIGN KEY ("sourceServiceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependencies" ADD CONSTRAINT "dependencies_targetServiceId_fkey" FOREIGN KEY ("targetServiceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_results" ADD CONSTRAINT "simulation_results_affectedServiceId_fkey" FOREIGN KEY ("affectedServiceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
