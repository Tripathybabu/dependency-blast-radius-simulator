"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { servicesApi, dependenciesApi, type Service, type CreateServiceInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ServiceForm } from "@/components/services/ServiceForm";
import { toast } from "@/hooks/use-toast";
import {
  Plus, Search, Trash2, Edit, Server, GitBranch, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const criticalityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

const statusBadge: Record<string, "success" | "warning" | "destructive"> = {
  healthy: "success",
  degraded: "warning",
  failed: "destructive",
};

const critBadge: Record<string, "destructive" | "warning" | "secondary" | "default"> = {
  critical: "destructive",
  high: "warning",
  medium: "secondary",
  low: "default",
};

export default function ServicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [critFilter, setCritFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [depDialog, setDepDialog] = useState<Service | null>(null);
  const [depSource, setDepSource] = useState("");
  const [depTarget, setDepTarget] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: () => servicesApi.list(),
  });

  const { data: dependencies = [] } = useQuery({
    queryKey: ["dependencies"],
    queryFn: () => dependenciesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: servicesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["services-stats"] });
      setCreateOpen(false);
      toast({ title: "Service created" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateServiceInput> }) =>
      servicesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["services-stats"] });
      setEditService(null);
      toast({ title: "Service updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: servicesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      qc.invalidateQueries({ queryKey: ["services-stats"] });
      toast({ title: "Service deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addDepMutation = useMutation({
    mutationFn: dependenciesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependencies"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      setDepDialog(null);
      toast({ title: "Dependency added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeDepMutation = useMutation({
    mutationFn: dependenciesApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dependencies"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Dependency removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = services.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !(s.owner ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (critFilter !== "all" && s.criticality !== critFilter) return false;
    return true;
  });

  const depsByService = (serviceId: string) =>
    dependencies.filter((d) => d.sourceServiceId === serviceId || d.targetServiceId === serviceId);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services</h1>
          <p className="text-muted-foreground mt-1">
            {services.length} services registered
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service</DialogTitle>
            </DialogHeader>
            <ServiceForm
              onSubmit={async (data) => { createMutation.mutate(data); }}
              onCancel={() => setCreateOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or owner..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="degraded">Degraded</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Criticality" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All criticalities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading services...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No services found. Adjust your filters or add a new service.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((service) => {
            const deps = depsByService(service.id);
            const isExpanded = expandedId === service.id;
            return (
              <Card key={service.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/20 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : service.id)}
                  >
                    <Server className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{service.name}</span>
                        <Badge variant={critBadge[service.criticality]}>{service.criticality}</Badge>
                        <Badge variant={statusBadge[service.status]}>{service.status}</Badge>
                        {service.owner && (
                          <span className="text-xs text-muted-foreground">{service.owner}</span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {service.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" /> {deps.length}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setEditService(service); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete "${service.name}"?`)) deleteMutation.mutate(service.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Dependencies ({deps.length})</p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setDepSource(service.id); setDepTarget(""); setDepDialog(service); }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Dependency
                        </Button>
                      </div>
                      {deps.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No dependencies.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {deps.map((dep) => {
                            const isSource = dep.sourceServiceId === service.id;
                            const other = isSource ? dep.targetService : dep.sourceService;
                            return (
                              <div
                                key={dep.id}
                                className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-1.5"
                              >
                                <span className="flex items-center gap-2">
                                  <span className={cn("text-xs px-1.5 py-0.5 rounded font-mono",
                                    isSource ? "bg-blue-500/20 text-blue-300" : "bg-purple-500/20 text-purple-300")}>
                                    {isSource ? "depends on" : "depended by"}
                                  </span>
                                  <span>{other.name}</span>
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => removeDepMutation.mutate(dep.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editService} onOpenChange={(o) => !o && setEditService(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          {editService && (
            <ServiceForm
              initial={editService}
              onSubmit={async (data) => updateMutation.mutate({ id: editService.id, data })}
              onCancel={() => setEditService(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dependency Dialog */}
      <Dialog open={!!depDialog} onOpenChange={(o) => !o && setDepDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dependency</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">
                <strong>{depDialog?.name}</strong> depends on:
              </p>
              <Select value={depTarget} onValueChange={setDepTarget}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target service..." />
                </SelectTrigger>
                <SelectContent>
                  {services
                    .filter((s) => s.id !== depDialog?.id)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDepDialog(null)}>Cancel</Button>
              <Button
                disabled={!depTarget || addDepMutation.isPending}
                onClick={() =>
                  addDepMutation.mutate({
                    sourceServiceId: depSource,
                    targetServiceId: depTarget,
                  })
                }
              >
                {addDepMutation.isPending ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
