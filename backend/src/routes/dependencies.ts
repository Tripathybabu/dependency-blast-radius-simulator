import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { detectCircularDependency } from "../lib/graphAlgorithms";

const router = Router();

const DependencySchema = z.object({
  sourceServiceId: z.string().uuid(),
  targetServiceId: z.string().uuid(),
  dependencyType: z.string().default("hard"),
});

// GET /dependencies - list all dependencies
router.get("/", async (_req, res) => {
  const deps = await prisma.dependency.findMany({
    include: {
      sourceService: { select: { id: true, name: true, criticality: true, status: true } },
      targetService: { select: { id: true, name: true, criticality: true, status: true } },
    },
  });
  res.json(deps);
});

// POST /dependencies - create a dependency with circular check
router.post("/", async (req, res) => {
  const data = DependencySchema.parse(req.body);

  if (data.sourceServiceId === data.targetServiceId) {
    throw new AppError(400, "A service cannot depend on itself.");
  }

  const [source, target] = await Promise.all([
    prisma.service.findUnique({ where: { id: data.sourceServiceId } }),
    prisma.service.findUnique({ where: { id: data.targetServiceId } }),
  ]);

  if (!source) throw new AppError(404, "Source service not found");
  if (!target) throw new AppError(404, "Target service not found");

  const existingDeps = await prisma.dependency.findMany({
    select: { sourceServiceId: true, targetServiceId: true },
  });

  const cycle = detectCircularDependency(
    data.sourceServiceId,
    data.targetServiceId,
    existingDeps
  );

  if (cycle) {
    throw new AppError(
      409,
      `Circular dependency detected: ${cycle.join(" → ")}`
    );
  }

  const dependency = await prisma.dependency.create({
    data,
    include: {
      sourceService: { select: { id: true, name: true } },
      targetService: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(dependency);
});

// DELETE /dependencies/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.dependency.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Dependency not found");

  await prisma.dependency.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
