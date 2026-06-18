import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";
import { Criticality, ServiceStatus } from "@prisma/client";

const router = Router();

const ServiceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  owner: z.string().optional(),
  criticality: z.nativeEnum(Criticality).default("medium"),
  status: z.nativeEnum(ServiceStatus).default("healthy"),
  metadata: z.record(z.unknown()).optional(),
});

const ServiceUpdateSchema = ServiceSchema.partial();

// GET /services - list all services with optional search/filter
router.get("/", async (req, res) => {
  const { search, status, criticality, owner, sortBy } = req.query as Record<string, string>;

  const where: any = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (status) where.status = status;
  if (criticality) where.criticality = criticality;
  if (owner) where.owner = { contains: owner, mode: "insensitive" };

  const orderBy: any =
    sortBy === "name" ? { name: "asc" }
    : sortBy === "criticality" ? { criticality: "asc" }
    : { createdAt: "desc" };

  const services = await prisma.service.findMany({
    where,
    orderBy,
    include: {
      dependsOn: { include: { targetService: { select: { id: true, name: true } } } },
      dependedOnBy: { include: { sourceService: { select: { id: true, name: true } } } },
    },
  });

  res.json(services);
});

// GET /services/stats - health dashboard counts
router.get("/stats", async (_req, res) => {
  const [total, healthy, degraded, failed, criticalCount] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { status: "healthy" } }),
    prisma.service.count({ where: { status: "degraded" } }),
    prisma.service.count({ where: { status: "failed" } }),
    prisma.service.count({ where: { criticality: "critical" } }),
  ]);

  res.json({ total, healthy, degraded, failed, critical: criticalCount });
});

// GET /services/:id
router.get("/:id", async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: {
      dependsOn: { include: { targetService: true } },
      dependedOnBy: { include: { sourceService: true } },
    },
  });

  if (!service) throw new AppError(404, "Service not found");
  res.json(service);
});

// POST /services
router.post("/", async (req, res) => {
  const data = ServiceSchema.parse(req.body);
  const service = await prisma.service.create({
    data: { ...data, metadata: data.metadata as Prisma.InputJsonValue },
  });
  res.status(201).json(service);
});

// PATCH /services/:id
router.patch("/:id", async (req, res) => {
  const data = ServiceUpdateSchema.parse(req.body);

  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Service not found");

  const updated = await prisma.service.update({
    where: { id: req.params.id },
    data: { ...data, metadata: data.metadata as Prisma.InputJsonValue },
  });
  res.json(updated);
});

// DELETE /services/:id
router.delete("/:id", async (req, res) => {
  const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError(404, "Service not found");

  await prisma.service.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
