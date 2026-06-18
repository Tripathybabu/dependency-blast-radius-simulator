"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { cn } from "@/lib/utils";

export interface ServiceNodeData {
  label: string;
  criticality: "low" | "medium" | "high" | "critical";
  status: "healthy" | "degraded" | "failed";
  owner?: string;
  isFailed?: boolean;
  isImpacted?: boolean;
  impactType?: "direct" | "indirect";
  severityScore?: number;
  depth?: number;
}

const critColors: Record<string, string> = {
  critical: "border-red-500",
  high: "border-orange-500",
  medium: "border-yellow-500",
  low: "border-green-500",
};

const statusDot: Record<string, string> = {
  healthy: "bg-green-400",
  degraded: "bg-yellow-400",
  failed: "bg-red-400",
};

export const ServiceNode = memo(({ data }: NodeProps<ServiceNodeData>) => {
  const isHighlighted = data.isFailed || data.isImpacted;

  return (
    <div
      className={cn(
        "rounded-lg border-2 bg-card shadow-md min-w-[140px] max-w-[180px] transition-all",
        critColors[data.criticality],
        data.isFailed && "ring-2 ring-red-500 ring-offset-1 ring-offset-background bg-red-950/40",
        data.isImpacted && data.impactType === "direct" && "ring-2 ring-orange-500 ring-offset-1 ring-offset-background bg-orange-950/30",
        data.isImpacted && data.impactType === "indirect" && "ring-1 ring-yellow-500/60 bg-yellow-950/20",
        !isHighlighted && "opacity-90"
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground !w-2 !h-2" />

      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={cn("w-2 h-2 rounded-full shrink-0", statusDot[data.status])} />
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-mono truncate flex-1">
            {data.criticality}
          </span>
          {data.isFailed && (
            <span className="text-xs bg-red-500 text-white px-1 rounded font-bold">FAIL</span>
          )}
          {data.isImpacted && (
            <span className={cn(
              "text-xs px-1 rounded font-bold",
              data.impactType === "direct" ? "bg-orange-500 text-white" : "bg-yellow-600 text-white"
            )}>
              {data.impactType === "direct" ? "D" : `L${data.depth}`}
            </span>
          )}
        </div>
        <p className="text-sm font-semibold leading-tight">{data.label}</p>
        {data.owner && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{data.owner}</p>
        )}
        {data.severityScore !== undefined && data.isImpacted && (
          <p className="text-xs text-yellow-400 mt-1 font-mono">
            ⚡ {data.severityScore.toFixed(0)}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
});

ServiceNode.displayName = "ServiceNode";
