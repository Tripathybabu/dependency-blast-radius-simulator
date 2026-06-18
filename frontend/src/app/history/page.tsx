"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { simulationsApi, servicesApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDate, severityColor, severityLabel } from "@/lib/utils";
import Link from "next/link";
import {
  History, Trash2, ChevronRight, Activity, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryPage() {
  const qc = useQueryClient();

  const { data: simulations = [], isLoading } = useQuery({
    queryKey: ["simulations"],
    queryFn: () => simulationsApi.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const serviceMap = Object.fromEntries(services.map((s) => [s.id, s]));

  const deleteMutation = useMutation({
    mutationFn: simulationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["simulations"] });
      toast({ title: "Simulation deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-7 w-7" /> Simulation History
        </h1>
        <p className="text-muted-foreground mt-1">
          {simulations.length} simulations recorded
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : simulations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No simulations yet.</p>
            <Button asChild className="mt-4" variant="outline">
              <Link href="/simulate">Run your first simulation</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {simulations.map((sim) => {
            const failedNames = sim.failedServiceIds
              .map((id) => serviceMap[id]?.name ?? id)
              .join(", ");

            return (
              <Card key={sim.id} className="hover:border-muted-foreground/50 transition-colors">
                <CardContent className="p-0">
                  <div className="p-5 flex items-start gap-4">
                    <div
                      className={cn(
                        "p-2.5 rounded-lg shrink-0 mt-0.5",
                        sim.severityScore >= 200
                          ? "bg-red-500/10"
                          : sim.severityScore >= 100
                          ? "bg-orange-500/10"
                          : sim.severityScore >= 50
                          ? "bg-yellow-500/10"
                          : "bg-green-500/10"
                      )}
                    >
                      <AlertTriangle
                        className={cn("h-5 w-5", severityColor(sim.severityScore))}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold truncate">{sim.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(sim.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              if (confirm("Delete this simulation?")) deleteMutation.mutate(sim.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/history/${sim.id}`}>
                              Details <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <span className="text-muted-foreground">
                          Failed:{" "}
                          <span className="text-red-400 font-medium">{failedNames}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Impacted:{" "}
                          <span className="text-foreground font-medium">{sim.impactedCount}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Severity:{" "}
                          <span className={cn("font-semibold", severityColor(sim.severityScore))}>
                            {sim.severityScore.toFixed(0)} ({severityLabel(sim.severityScore)})
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          Max depth:{" "}
                          <span className="text-foreground font-medium">
                            {sim.blastRadius?.maxDepth ?? 0}
                          </span>
                        </span>
                      </div>

                      {sim.summary && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">{sim.summary}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
