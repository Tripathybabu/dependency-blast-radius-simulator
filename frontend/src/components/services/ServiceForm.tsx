"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Service, CreateServiceInput, Criticality, ServiceStatus } from "@/lib/api";

interface ServiceFormProps {
  initial?: Service;
  onSubmit: (data: CreateServiceInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ServiceForm({ initial, onSubmit, onCancel, isSubmitting }: ServiceFormProps) {
  const [form, setForm] = useState<CreateServiceInput>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    owner: initial?.owner ?? "",
    criticality: initial?.criticality ?? "medium",
    status: initial?.status ?? "healthy",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Service Name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Auth Service"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What does this service do?"
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="owner">Owner / Team</Label>
        <Input
          id="owner"
          value={form.owner}
          onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          placeholder="e.g. platform-team"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Criticality</Label>
          <Select
            value={form.criticality}
            onValueChange={(v) => setForm((f) => ({ ...f, criticality: v as Criticality }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v as ServiceStatus }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="healthy">Healthy</SelectItem>
              <SelectItem value="degraded">Degraded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : initial ? "Update Service" : "Create Service"}
        </Button>
      </div>
    </form>
  );
}
