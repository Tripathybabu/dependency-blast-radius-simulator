const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Services ----
export const servicesApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<Service[]>(`/services${qs}`);
  },
  stats: () => request<ServiceStats>("/services/stats"),
  get: (id: string) => request<ServiceDetail>(`/services/${id}`),
  create: (data: CreateServiceInput) =>
    request<Service>("/services", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<CreateServiceInput>) =>
    request<Service>(`/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/services/${id}`, { method: "DELETE" }),
};

// ---- Dependencies ----
export const dependenciesApi = {
  list: () => request<DependencyEdge[]>("/dependencies"),
  create: (data: CreateDependencyInput) =>
    request<DependencyEdge>("/dependencies", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/dependencies/${id}`, { method: "DELETE" }),
};

// ---- Simulations ----
export const simulationsApi = {
  list: () => request<Simulation[]>("/simulations"),
  get: (id: string) => request<Simulation>(`/simulations/${id}`),
  run: (data: RunSimulationInput) =>
    request<Simulation>("/simulations", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/simulations/${id}`, { method: "DELETE" }),
};

// ---- Types ----
export type Criticality = "low" | "medium" | "high" | "critical";
export type ServiceStatus = "healthy" | "degraded" | "failed";

export interface Service {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  criticality: Criticality;
  status: ServiceStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceDetail extends Service {
  dependsOn: Array<{ id: string; targetServiceId: string; targetService: Service }>;
  dependedOnBy: Array<{ id: string; sourceServiceId: string; sourceService: Service }>;
}

export interface ServiceStats {
  total: number;
  healthy: number;
  degraded: number;
  failed: number;
  critical: number;
}

export interface DependencyEdge {
  id: string;
  sourceServiceId: string;
  targetServiceId: string;
  dependencyType: string;
  sourceService: Pick<Service, "id" | "name" | "criticality" | "status">;
  targetService: Pick<Service, "id" | "name" | "criticality" | "status">;
  createdAt: string;
}

export interface SimulationResult {
  id: string;
  simulationId: string;
  affectedServiceId: string;
  impactType: "direct" | "indirect";
  depth: number;
  dependencyPath: string[];
  severityScore: number;
  affectedService: Pick<Service, "id" | "name" | "criticality" | "status">;
}

export interface Simulation {
  id: string;
  name?: string;
  failedServiceIds: string[];
  blastRadius: BlastRadiusData;
  severityScore: number;
  impactedCount: number;
  status: "running" | "completed";
  summary?: string;
  results: SimulationResult[];
  createdAt: string;
}

export interface BlastRadiusData {
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

export interface CreateServiceInput {
  name: string;
  description?: string;
  owner?: string;
  criticality: Criticality;
  status: ServiceStatus;
}

export interface CreateDependencyInput {
  sourceServiceId: string;
  targetServiceId: string;
  dependencyType?: string;
}

export interface RunSimulationInput {
  name?: string;
  failedServiceIds: string[];
}
