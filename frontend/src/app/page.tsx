"use client";

import { useQuery } from "@tanstack/react-query";
import { servicesApi, simulationsApi } from "@/lib/api";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, severityColor, severityLabel } from "@/lib/utils";
import {
  Server, CheckCircle, AlertTriangle, XCircle, ShieldAlert, Zap, Activity,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const criticalityColors: Record<string, string> = {
  critical: "text-red-400",
  high: "text-orange-400",
  medium: "text-yellow-400",
  low: "text-green-400",
};

const statusBadge: Record<string, "success" | "warning" | "destructive"> = {
  healthy: "success",
  degraded: "warning",
  failed: "destructive",
};

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["services-stats"],
    queryFn: () => servicesApi.stats(),
    refetchInterval: 15_000,
  });

  const { data: simulations } = useQuery({
    queryKey: ["simulations"],
    queryFn: () => simulationsApi.list(),
  });

  const { data: services } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const recentSimulations = simulations?.slice(0, 5) ?? [];
  const criticalServices = services?.filter((s) => s.criticality === "critical") ?? [];
  const unhealthyServices = services?.filter((s) => s.status !== "healthy") ?? [];

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your distributed service ecosystem
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/services">Manage Services</Link>
          </Button>
          <Button asChild>
            <Link href="/simulate">
              <Zap className="h-4 w-4 mr-2" /> Run Simulation
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Services"
          value={statsLoading ? "—" : (stats?.total ?? 0)}
          icon={<Server className="h-5 w-5" />}
          color="text-primary"
        />
        <StatCard
          label="Healthy"
          value={statsLoading ? "—" : (stats?.healthy ?? 0)}
          icon={<CheckCircle className="h-5 w-5" />}
          color="text-green-400"
        />
        <StatCard
          label="Degraded"
          value={statsLoading ? "—" : (stats?.degraded ?? 0)}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-yellow-400"
        />
        <StatCard
          label="Failed"
          value={statsLoading ? "—" : (stats?.failed ?? 0)}
          icon={<XCircle className="h-5 w-5" />}
          color="text-red-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Simulations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Simulations</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/history">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSimulations.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                No simulations yet.{" "}
                <Link href="/simulate" className="text-primary hover:underline">
                  Run your first simulation
                </Link>
              </p>
            ) : (
              recentSimulations.map((sim) => (
                <Link key={sim.id} href={`/history/${sim.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[280px]">{sim.name}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(sim.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {sim.impactedCount} affected
                      </span>
                      <span className={`text-xs font-semibold ${severityColor(sim.severityScore)}`}>
                        {severityLabel(sim.severityScore)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Critical services */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-red-400" /> Critical Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {criticalServices.length === 0 ? (
                <p className="text-muted-foreground text-xs">None registered</p>
              ) : (
                criticalServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <Badge variant={statusBadge[s.status]}>{s.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {unhealthyServices.length > 0 && (
            <Card className="border-yellow-500/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-yellow-400">
                  <AlertTriangle className="h-4 w-4" /> Attention Required
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unhealthyServices.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <Badge variant={statusBadge[s.status]}>{s.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
