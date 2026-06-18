import { Criticality, Service, Dependency } from "@prisma/client";

type ServiceWithDeps = Service & {
  dependsOn: Dependency[];
  dependedOnBy: Dependency[];
};

const CRITICALITY_WEIGHTS: Record<Criticality, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
};

/**
 * Detects circular dependencies using DFS with in-stack tracking.
 * Returns the cycle path if found, null otherwise.
 */
export function detectCircularDependency(
  newSourceId: string,
  newTargetId: string,
  existingDeps: { sourceServiceId: string; targetServiceId: string }[]
): string[] | null {
  const adj = new Map<string, string[]>();

  for (const dep of existingDeps) {
    if (!adj.has(dep.sourceServiceId)) adj.set(dep.sourceServiceId, []);
    adj.get(dep.sourceServiceId)!.push(dep.targetServiceId);
  }

  // Add the proposed new dependency
  if (!adj.has(newSourceId)) adj.set(newSourceId, []);
  adj.get(newSourceId)!.push(newTargetId);

  const visited = new Set<string>();
  const inStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): string[] | null {
    visited.add(node);
    inStack.add(node);
    path.push(node);

    for (const neighbor of adj.get(node) ?? []) {
      if (!visited.has(neighbor)) {
        const cycle = dfs(neighbor);
        if (cycle) return cycle;
      } else if (inStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        return [...path.slice(cycleStart), neighbor];
      }
    }

    path.pop();
    inStack.delete(node);
    return null;
  }

  for (const node of adj.keys()) {
    if (!visited.has(node)) {
      const cycle = dfs(node);
      if (cycle) return cycle;
    }
  }

  return null;
}

export interface BlastRadiusResult {
  directlyImpacted: ImpactedService[];
  indirectlyImpacted: ImpactedService[];
  totalImpacted: number;
  severityScore: number;
  maxDepth: number;
}

export interface ImpactedService {
  serviceId: string;
  serviceName: string;
  criticality: Criticality;
  depth: number;
  impactType: "direct" | "indirect";
  dependencyPath: string[];
  severityScore: number;
}

/**
 * BFS traversal of the reverse dependency graph to find all services
 * that are impacted when the given services fail.
 *
 * "A depends on B" means if B fails, A is impacted.
 * So we traverse: from failed service → services that depend on it (dependedOnBy).
 */
export function computeBlastRadius(
  failedServiceIds: string[],
  allServices: ServiceWithDeps[]
): BlastRadiusResult {
  const serviceMap = new Map<string, ServiceWithDeps>();
  for (const s of allServices) serviceMap.set(s.id, s);

  // Build reverse adjacency: targetId → [sourceIds that depend on it]
  const reverseAdj = new Map<string, string[]>();
  for (const service of allServices) {
    for (const dep of service.dependsOn) {
      // service depends on dep.targetServiceId
      // so if dep.targetServiceId fails, service is impacted
      if (!reverseAdj.has(dep.targetServiceId))
        reverseAdj.set(dep.targetServiceId, []);
      reverseAdj.get(dep.targetServiceId)!.push(service.id);
    }
  }

  const failedSet = new Set(failedServiceIds);
  const visited = new Set<string>(failedServiceIds);
  const impacted = new Map<string, ImpactedService>();

  type QueueItem = { serviceId: string; depth: number; path: string[] };
  const queue: QueueItem[] = failedServiceIds.map((id) => ({
    serviceId: id,
    depth: 0,
    path: [id],
  }));

  while (queue.length > 0) {
    const { serviceId, depth, path } = queue.shift()!;

    const dependents = reverseAdj.get(serviceId) ?? [];
    for (const dependentId of dependents) {
      if (visited.has(dependentId)) continue;
      visited.add(dependentId);

      const dependentService = serviceMap.get(dependentId);
      if (!dependentService) continue;

      const newDepth = depth + 1;
      const newPath = [...path, dependentId];
      const impactType: "direct" | "indirect" = newDepth === 1 ? "direct" : "indirect";

      const critWeight = CRITICALITY_WEIGHTS[dependentService.criticality];
      const depthDecay = 1 / newDepth;
      const severityScore = parseFloat((critWeight * depthDecay * 100).toFixed(2));

      impacted.set(dependentId, {
        serviceId: dependentId,
        serviceName: dependentService.name,
        criticality: dependentService.criticality,
        depth: newDepth,
        impactType,
        dependencyPath: newPath,
        severityScore,
      });

      queue.push({ serviceId: dependentId, depth: newDepth, path: newPath });
    }
  }

  const allImpacted = Array.from(impacted.values());
  const directlyImpacted = allImpacted.filter((s) => s.impactType === "direct");
  const indirectlyImpacted = allImpacted.filter((s) => s.impactType === "indirect");

  // Total severity: aggregate with diminishing returns for count
  const totalSeverity = allImpacted.reduce((sum, s) => sum + s.severityScore, 0);
  const failedCriticalityBonus = failedServiceIds.reduce((sum, id) => {
    const svc = serviceMap.get(id);
    return sum + (svc ? CRITICALITY_WEIGHTS[svc.criticality] * 100 : 0);
  }, 0);

  const severityScore = parseFloat(
    Math.min(totalSeverity + failedCriticalityBonus, 1000).toFixed(2)
  );

  const maxDepth = allImpacted.reduce((max, s) => Math.max(max, s.depth), 0);

  return {
    directlyImpacted,
    indirectlyImpacted,
    totalImpacted: allImpacted.length,
    severityScore,
    maxDepth,
  };
}
