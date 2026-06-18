"use client";

import { useQuery } from "@tanstack/react-query";
import { simulationsApi, servicesApi, dependenciesApi } from "@/lib/api";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, severityColor, severityLabel, cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, ArrowRight } from "lucide-react";
import { useState } from "react";
import type { ImpactedService } from "@/lib/api";

export default function SimulationDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [selectedPath, setSelectedPath] = useState<ImpactedService | null>(null);

  const { data: simulation, isLoading } = useQuery({
    queryKey: ["simulations", id],
    queryFn: () => simulationsApi.get(id),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ["dependencies"],
    queryFn: () => dependenciesApi.list(),
  });

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading simulation...</div>;
  if (!simulation) return <div className="p-8 text-destructive">Simulation not found.</div>;

  const allImpacted = [
    ...(simulation.blastRadius?.directlyImpacted ?? []),
    ...(simulation.blastRadius?.indirectlyImpacted ?? []),
  ];

  const pathServices = selectedPath
    ? selectedPath.dependencyPath.map((id) => serviceMap[id]?.name ?? id)
    : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/history">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Link>
          </Button>
        </div>
        <h1 className="text-xl font-bold">{simulation.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(simulation.createdAt)}</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - results */}
        <div className="w-72 shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* Stats */}
          <div className="p-4 space-y-3 border-b border-border">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Impacted</p>
                  <p className="text-2xl font-bold">{simulation.impactedCount}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Severity</p>
                  <p className={cn("text-2xl font-bold", severityColor(simulation.severityScore))}>
                    {simulation.severityScore.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
            </div>
            <div className="text-sm font-semibold text-muted-foreground">
              {severityLabel(simulation.severityScore)} severity • depth {simulation.blastRadius?.maxDepth}
            </div>
          </div>

          {/* Failed services */}
          <div className="p-4 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Failed Services</p>
            {simulation.failedServiceIds.map((id) => (
              <div key={id} className="flex items-center gap-2 text-sm py-1">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span>{serviceMap[id]?.name ?? id}</span>
                <Badge variant="destructive" className="ml-auto text-xs">
                  {serviceMap[id]?.criticality}
                </Badge>
              </div>
            ))}
          </div>

          {/* Impacted list */}
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
              Impacted Services ({allImpacted.length})
            </p>
            <div className="space-y-1">
              {allImpacted.map((s) => (
                <button
                  key={s.serviceId}
                  onClick={() => setSelectedPath(selectedPath?.serviceId === s.serviceId ? null : s)}
                  className={cn(
                    "w-full text-left px-2.5 py-2 rounded-lg border text-sm transition-all",
                    selectedPath?.serviceId === s.serviceId
                      ? "border-primary bg-primary/10"
                      : "border-transparent hover:border-border hover:bg-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{s.serviceName}</span>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-mono shrink-0 ml-1",
                      s.impactType === "direct"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-yellow-500/20 text-yellow-300"
                    )}>
                      D{s.depth}
                    </span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-muted-foreground">{s.impactType}</span>
                    <span className={cn("text-xs font-mono", severityColor(s.severityScore))}>
                      ⚡{s.severityScore.toFixed(0)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Path details */}
          {selectedPath && (
            <div className="p-4 border-t border-border bg-muted/20">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Dependency path to {selectedPath.serviceName}
              </p>
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {pathServices.map((name, i) => (
                  <span key={i} className="flex items-center gap-1">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded font-medium",
                      i === 0 ? "bg-red-500/20 text-red-300"
                      : i === pathServices.length - 1 ? "bg-orange-500/20 text-orange-300"
                      : "bg-muted text-muted-foreground"
                    )}>
                      {name}
                    </span>
                    {i < pathServices.length - 1 && (
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph */}
        <div className="flex-1 relative">
          <DependencyGraph
            services={services}
            dependencies={dependencies}
            failedServiceIds={simulation.failedServiceIds}
            impactedServices={allImpacted}
          />
        </div>
      </div>
    </div>
  );
}
