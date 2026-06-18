import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.simulationResult.deleteMany();
  await prisma.simulation.deleteMany();
  await prisma.dependency.deleteMany();
  await prisma.service.deleteMany();

  // Create services
  const services = await Promise.all([
    prisma.service.create({
      data: { name: "API Gateway", description: "Main entry point for all client requests", owner: "platform-team", criticality: "critical", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Auth Service", description: "Handles authentication and authorization", owner: "security-team", criticality: "critical", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "User Service", description: "Manages user profiles and preferences", owner: "core-team", criticality: "high", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Order Service", description: "Processes and manages customer orders", owner: "commerce-team", criticality: "high", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Payment Service", description: "Handles payment processing and billing", owner: "finance-team", criticality: "critical", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Notification Service", description: "Sends emails, SMS, and push notifications", owner: "core-team", criticality: "medium", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Inventory Service", description: "Tracks product inventory and availability", owner: "commerce-team", criticality: "high", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Search Service", description: "Full-text search and indexing", owner: "platform-team", criticality: "medium", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Analytics Service", description: "Event tracking and business intelligence", owner: "data-team", criticality: "low", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Cache Service", description: "Redis-based distributed caching layer", owner: "platform-team", criticality: "high", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Database Service", description: "Primary PostgreSQL database", owner: "data-team", criticality: "critical", status: "healthy" },
    }),
    prisma.service.create({
      data: { name: "Media Service", description: "Image and video storage and processing", owner: "core-team", criticality: "low", status: "healthy" },
    }),
  ]);

  const byName = Object.fromEntries(services.map((s) => [s.name, s]));

  // Create dependencies (source depends on target)
  await Promise.all([
    // API Gateway depends on Auth + Cache
    prisma.dependency.create({ data: { sourceServiceId: byName["API Gateway"].id, targetServiceId: byName["Auth Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["API Gateway"].id, targetServiceId: byName["Cache Service"].id } }),

    // Auth Service depends on Database + Cache
    prisma.dependency.create({ data: { sourceServiceId: byName["Auth Service"].id, targetServiceId: byName["Database Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Auth Service"].id, targetServiceId: byName["Cache Service"].id } }),

    // User Service depends on Database + Cache + Notification
    prisma.dependency.create({ data: { sourceServiceId: byName["User Service"].id, targetServiceId: byName["Database Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["User Service"].id, targetServiceId: byName["Cache Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["User Service"].id, targetServiceId: byName["Notification Service"].id } }),

    // Order Service depends on User + Inventory + Payment + Notification
    prisma.dependency.create({ data: { sourceServiceId: byName["Order Service"].id, targetServiceId: byName["User Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Order Service"].id, targetServiceId: byName["Inventory Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Order Service"].id, targetServiceId: byName["Payment Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Order Service"].id, targetServiceId: byName["Notification Service"].id } }),

    // Payment Service depends on Database + Notification
    prisma.dependency.create({ data: { sourceServiceId: byName["Payment Service"].id, targetServiceId: byName["Database Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Payment Service"].id, targetServiceId: byName["Notification Service"].id } }),

    // Inventory Service depends on Database + Cache
    prisma.dependency.create({ data: { sourceServiceId: byName["Inventory Service"].id, targetServiceId: byName["Database Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Inventory Service"].id, targetServiceId: byName["Cache Service"].id } }),

    // Search Service depends on Database + Cache + Analytics
    prisma.dependency.create({ data: { sourceServiceId: byName["Search Service"].id, targetServiceId: byName["Database Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Search Service"].id, targetServiceId: byName["Cache Service"].id } }),
    prisma.dependency.create({ data: { sourceServiceId: byName["Search Service"].id, targetServiceId: byName["Analytics Service"].id } }),

    // Analytics Service depends on Database
    prisma.dependency.create({ data: { sourceServiceId: byName["Analytics Service"].id, targetServiceId: byName["Database Service"].id } }),

    // Notification Service depends on Database
    prisma.dependency.create({ data: { sourceServiceId: byName["Notification Service"].id, targetServiceId: byName["Database Service"].id } }),

    // Media Service depends on Cache
    prisma.dependency.create({ data: { sourceServiceId: byName["Media Service"].id, targetServiceId: byName["Cache Service"].id } }),
  ]);

  console.log(`✅ Seeded ${services.length} services and dependencies.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
