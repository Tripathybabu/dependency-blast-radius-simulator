"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, dependenciesApi } from "@/lib/api";
import { DependencyGraph } from "@/components/graph/DependencyGraph";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function GraphPage() {
  const qc = useQueryClient();

  const { data: services = [], isLoading: sLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const { data: dependencies = [], isLoading: dLoading } = useQuery({
    queryKey: ["dependencies"],
    queryFn: () => dependenciesApi.list(),
  });

  const addDepMutation = useMutation({
    mutationFn: dependenciesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependencies"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Dependency created from graph" });
    },
    onError: (e: Error) => toast({ title: "Cannot create dependency", description: e.message, variant: "destructive" }),
  });

  const isLoading = sLoading || dLoading;

  return (
    <div className="flex flex-col h-screen">
      <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Dependency Graph</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Interactive visualization of all service relationships
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-red-500 inline-block" /> Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-orange-500 inline-block" /> High
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-yellow-500 inline-block" /> Medium
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border-2 border-green-500 inline-block" /> Low
            </span>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">{services.length} services</Badge>
            <Badge variant="outline">{dependencies.length} dependencies</Badge>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading graph...
          </div>
        ) : services.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No services yet. Add services to see the graph.
              </CardContent>
            </Card>
          </div>
        ) : (
          <DependencyGraph
            services={services}
            dependencies={dependencies}
            onConnect={(sourceId, targetId) =>
              addDepMutation.mutate({ sourceServiceId: sourceId, targetServiceId: targetId })
            }
          />
        )}
      </div>

      <div className="p-3 border-t border-border text-xs text-muted-foreground shrink-0">
        Drag nodes to reposition • Connect nodes by dragging from a handle to add a dependency
      </div>
    </div>
  );
}
