"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, simulationsApi, type Service, type Simulation, type ImpactedService } from "@/lib/api";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { dependenciesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { getSocket } from "@/lib/socket";
import { cn, formatDate, severityColor, severityLabel } from "@/lib/utils";
import {
  Zap, AlertTriangle, CheckCircle, ChevronRight, RotateCcw, ArrowRight,
} from "lucide-react";

const critBadge: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
  critical: "destructive", high: "warning", medium: "secondary", low: "default",
};

export default function SimulatePage() {
  const qc = useQueryClient();
  const [selectedFailedIds, setSelectedFailedIds] = useState<string[]>([]);
  const [result, setResult] = useState<Simulation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedPath, setSelectedPath] = useState<ImpactedService | null>(null);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ["dependencies"],
    queryFn: () => dependenciesApi.list(),
  });

  // Socket.io for real-time updates
  useEffect(() => {
    const socket = getSocket();
    socket.on("simulation:started", () => setIsSimulating(true));
    socket.on("simulation:completed", (sim: Simulation) => {
      setIsSimulating(false);
      setResult(sim);
      qc.invalidateQueries({ queryKey: ["simulations"] });
    });
    return () => {
      socket.off("simulation:started");
      socket.off("simulation:completed");
    };
  }, [qc]);

  const runMutation = useMutation({
    mutationFn: simulationsApi.run,
    onError: (e: Error) => {
      setIsSimulating(false);
      toast({ title: "Simulation failed", description: e.message, variant: "destructive" });
    },
  });

  const toggleService = (id: string) => {
    setSelectedFailedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const runSimulation = () => {
    if (selectedFailedIds.length === 0) return;
    setResult(null);
    setSelectedPath(null);
    runMutation.mutate({ failedServiceIds: selectedFailedIds });
  };

  const reset = () => {
    setSelectedFailedIds([]);
    setResult(null);
    setSelectedPath(null);
  };

  const allImpacted = result
    ? [...(result.blastRadius?.directlyImpacted ?? []), ...(result.blastRadius?.indirectlyImpacted ?? [])]
    : [];

  const pathServices = selectedPath
    ? selectedPath.dependencyPath.map((id) => services.find((s) => s.id === id)?.name ?? id)
    : [];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden">
        <div className="p-5 border-b border-border">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Failure Simulator
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Select services to fail and observe the blast radius
          </p>
        </div>

        {/* Service selector */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select services to fail ({selectedFailedIds.length} selected)
          </p>
          {services.map((s) => {
            const selected = selectedFailedIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleService(s.id)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm",
                  selected
                    ? "border-red-500 bg-red-950/40 text-red-200"
                    : "border-border hover:border-muted-foreground hover:bg-accent/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{s.name}</span>
                  <Badge variant={critBadge[s.criticality]} className="text-xs shrink-0 ml-2">
                    {s.criticality}
                  </Badge>
                </div>
                {s.owner && <p className="text-xs text-muted-foreground mt-0.5">{s.owner}</p>}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            className="w-full"
            onClick={runSimulation}
            disabled={selectedFailedIds.length === 0 || isSimulating}
          >
            {isSimulating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Simulating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Run Simulation
              </span>
            )}
          </Button>
          {(selectedFailedIds.length > 0 || result) && (
            <Button variant="outline" className="w-full" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5 mr-2" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* Main graph */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 relative">
          <DependencyGraph
            services={services}
            dependencies={dependencies}
            failedServiceIds={selectedFailedIds}
            impactedServices={allImpacted}
          />

          {/* Legend overlay */}
          {result && (
            <div className="absolute top-4 left-4 bg-card/90 backdrop-blur border border-border rounded-lg p-3 text-xs space-y-1.5">
              <p className="font-semibold">Simulation Legend</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-red-500 opacity-70 inline-block" /> Failed
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-orange-500 opacity-70 inline-block" /> Direct impact
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-yellow-500 opacity-50 inline-block" /> Indirect impact
              </div>
            </div>
          )}
        </div>

        {/* Results panel */}
        {result && (
          <div className="shrink-0 border-t border-border bg-card/50 overflow-y-auto max-h-64">
            <div className="p-4 space-y-3">
              {/* Summary row */}
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Impacted Services</p>
                  <p className="text-2xl font-bold">{result.impactedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Severity Score</p>
                  <p className={cn("text-2xl font-bold", severityColor(result.severityScore))}>
                    {result.severityScore.toFixed(0)}
                    <span className="text-sm ml-1 font-normal">({severityLabel(result.severityScore)})</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Depth</p>
                  <p className="text-2xl font-bold">{result.blastRadius?.maxDepth ?? 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Direct</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {result.blastRadius?.directlyImpacted.length ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Indirect</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {result.blastRadius?.indirectlyImpacted.length ?? 0}
                  </p>
                </div>
              </div>

              {/* Impacted services list */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImpacted.map((s) => (
                  <button
                    key={s.serviceId}
                    onClick={() => setSelectedPath(selectedPath?.serviceId === s.serviceId ? null : s)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-all",
                      selectedPath?.serviceId === s.serviceId
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground",
                      s.impactType === "direct" ? "border-l-2 border-l-orange-500" : "border-l-2 border-l-yellow-500"
                    )}
                  >
                    <span className="font-medium">{s.serviceName}</span>
                    <span className="text-muted-foreground ml-1">D{s.depth}</span>
                  </button>
                ))}
              </div>

              {/* Dependency path */}
              {selectedPath && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    Dependency path to <strong>{selectedPath.serviceName}</strong>
                    (severity: {selectedPath.severityScore.toFixed(0)})
                  </p>
                  <div className="flex items-center gap-1 flex-wrap text-sm">
                    {pathServices.map((name, i) => (
                      <span key={i} className="flex items-center gap-1">
                        <span className={cn(
                          "px-2 py-0.5 rounded",
                          i === 0
                            ? "bg-red-500/20 text-red-300"
                            : i === pathServices.length - 1
                            ? "bg-orange-500/20 text-orange-300"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {name}
                        </span>
                        {i < pathServices.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
