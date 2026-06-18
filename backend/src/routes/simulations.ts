import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { computeBlastRadius } from "../lib/graphAlgorithms";
import { getIO } from "../lib/socket";

const router = Router();

const SimulationSchema = z.object({
  name: z.string().optional(),
  failedServiceIds: z.array(z.string().uuid()).min(1),
});

// GET /simulations - list all historical simulations
router.get("/", async (_req, res) => {
  const simulations = await prisma.simulation.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      results: {
        include: {
          affectedService: { select: { id: true, name: true, criticality: true } },
        },
      },
    },
  });
  res.json(simulations);
});

// GET /simulations/:id - single simulation detail
router.get("/:id", async (req, res) => {
  const simulation = await prisma.simulation.findUnique({
    where: { id: req.params.id },
    include: {
      results: {
        include: {
          affectedService: { select: { id: true, name: true, criticality: true, status: true } },
        },
        orderBy: { depth: "asc" },
      },
    },
  });

  if (!simulation) throw new AppError(404, "Simulation not found");
  res.json(simulation);
});

// POST /simulations - run a new simulation
router.post("/", async (req, res) => {
  const { name, failedServiceIds } = SimulationSchema.parse(req.body);
  const io = getIO();

  // Emit 'simulation:started' to all connected clients
  io.emit("simulation:started", { failedServiceIds });

  // Fetch all services with their dependency edges
  const allServices = await prisma.service.findMany({
    include: { dependsOn: true, dependedOnBy: true },
  });

  const failedServices = allServices.filter((s) => failedServiceIds.includes(s.id));
  if (failedServices.length !== failedServiceIds.length) {
    throw new AppError(404, "One or more services not found");
  }

  const blastRadius = computeBlastRadius(failedServiceIds, allServices);

  const failedNames = failedServices.map((s) => s.name).join(", ");
  const autoName =
    name ?? `Simulate failure of ${failedNames.length > 50 ? failedNames.slice(0, 47) + "..." : failedNames}`;

  const simulation = await prisma.simulation.create({
    data: {
      name: autoName,
      failedServiceIds,
      severityScore: blastRadius.severityScore,
      impactedCount: blastRadius.totalImpacted,
      status: "completed",
      summary: `${blastRadius.totalImpacted} services impacted across ${blastRadius.maxDepth} dependency levels.`,
      blastRadius: blastRadius as any,
      results: {
        create: [
          ...blastRadius.directlyImpacted.map((s) => ({
            affectedServiceId: s.serviceId,
            impactType: "direct" as const,
            depth: s.depth,
            dependencyPath: s.dependencyPath,
            severityScore: s.severityScore,
          })),
          ...blastRadius.indirectlyImpacted.map((s) => ({
            affectedServiceId: s.serviceId,
            impactType: "indirect" as const,
            depth: s.depth,
            dependencyPath: s.dependencyPath,
            severityScore: s.severityScore,
          })),
        ],
      },
    },
    include: {
      results: {
        include: {
          affectedService: { select: { id: true, name: true, criticality: true } },
        },
      },
    },
  });

  // Emit real-time result
  io.emit("simulation:completed", simulation);

  res.status(201).json(simulation);
});

// DELETE /simulations/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.simulation.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Simulation not found");

  await prisma.simulation.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
