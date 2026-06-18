"use client";

import { useCallback, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  BackgroundVariant,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { ServiceNode, type ServiceNodeData } from "./ServiceNode";
import type { Service, DependencyEdge, ImpactedService } from "@/lib/api";

const nodeTypes = { serviceNode: ServiceNode };
const EMPTY_IDS: string[] = [];
const EMPTY_IMPACTED: ImpactedService[] = [];

interface DependencyGraphProps {
  services: Service[];
  dependencies: DependencyEdge[];
  failedServiceIds?: string[];
  impactedServices?: ImpactedService[];
  onConnect?: (sourceId: string, targetId: string) => void;
}

function buildLayout(services: Service[], deps: DependencyEdge[]) {
  // Simple layered layout using topological sort
  const adjOut = new Map<string, string[]>();
  const adjIn = new Map<string, number>();

  for (const s of services) {
    adjOut.set(s.id, []);
    adjIn.set(s.id, 0);
  }
  for (const d of deps) {
    adjOut.get(d.sourceServiceId)?.push(d.targetServiceId);
    adjIn.set(d.targetServiceId, (adjIn.get(d.targetServiceId) ?? 0) + 1);
  }

  // Kahn's algorithm to determine layers
  const layers: string[][] = [];
  const queue = services.filter((s) => (adjIn.get(s.id) ?? 0) === 0).map((s) => s.id);
  const visited = new Set<string>();

  while (queue.length > 0) {
    const layer = [...queue];
    layers.push(layer);
    queue.length = 0;
    for (const id of layer) {
      visited.add(id);
      for (const neighbor of adjOut.get(id) ?? []) {
        const newCount = (adjIn.get(neighbor) ?? 1) - 1;
        adjIn.set(neighbor, newCount);
        if (newCount === 0 && !visited.has(neighbor)) queue.push(neighbor);
      }
    }
  }

  // Any remaining (cycles or disconnected)
  const remaining = services.filter((s) => !visited.has(s.id)).map((s) => s.id);
  if (remaining.length > 0) layers.push(remaining);

  const positions = new Map<string, { x: number; y: number }>();
  const LAYER_WIDTH = 240;
  const NODE_HEIGHT = 100;

  layers.forEach((layer, li) => {
    const startY = -((layer.length - 1) * NODE_HEIGHT) / 2;
    layer.forEach((id, ni) => {
      positions.set(id, { x: li * LAYER_WIDTH, y: startY + ni * NODE_HEIGHT });
    });
  });

  return positions;
}

export function DependencyGraph({
  services,
  dependencies,
  failedServiceIds = EMPTY_IDS,
  impactedServices = EMPTY_IMPACTED,
  onConnect,
}: DependencyGraphProps) {
  const impactMap = useMemo(() => {
    const m = new Map<string, ImpactedService>();
    for (const s of impactedServices) m.set(s.serviceId, s);
    return m;
  }, [impactedServices]);

  const failedSet = useMemo(() => new Set(failedServiceIds), [failedServiceIds]);

  const positions = useMemo(() => buildLayout(services, dependencies), [services, dependencies]);

  const initialNodes: Node<ServiceNodeData>[] = useMemo(
    () =>
      services.map((s) => {
        const impact = impactMap.get(s.id);
        const isFailed = failedSet.has(s.id);
        return {
          id: s.id,
          type: "serviceNode",
          position: positions.get(s.id) ?? { x: 0, y: 0 },
          data: {
            label: s.name,
            criticality: s.criticality,
            status: s.status,
            owner: s.owner,
            isFailed,
            isImpacted: !!impact && !isFailed,
            impactType: impact?.impactType,
            severityScore: impact?.severityScore,
            depth: impact?.depth,
          },
        };
      }),
    [services, positions, impactMap, failedSet]
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      dependencies.map((d) => {
        const isHighlighted =
          failedSet.has(d.targetServiceId) ||
          (impactMap.has(d.sourceServiceId) && (failedSet.has(d.targetServiceId) || impactMap.has(d.targetServiceId)));

        return {
          id: d.id,
          source: d.sourceServiceId,
          target: d.targetServiceId,
          type: "smoothstep",
          animated: isHighlighted,
          markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? "#f97316" : "#64748b" },
          style: {
            stroke: isHighlighted ? "#f97316" : "#64748b",
            strokeWidth: isHighlighted ? 2 : 1.5,
          },
        };
      }),
    [dependencies, failedSet, impactMap]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && onConnect) {
        onConnect(connection.source, connection.target);
      }
      setEdges((eds) => addEdge(connection, eds));
    },
    [onConnect, setEdges]
  );

  return (
    <div style={{ width: "100%", height: "100%" }}>
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={handleConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      attributionPosition="bottom-right"
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#1e293b" />
      <Controls className="!bg-card !border-border" />
      <MiniMap
        className="!bg-card !border-border"
        nodeColor={(node) => {
          const d = node.data as ServiceNodeData;
          if (d.isFailed) return "#ef4444";
          if (d.isImpacted && d.impactType === "direct") return "#f97316";
          if (d.isImpacted) return "#eab308";
          return "#3b82f6";
        }}
      />
    </ReactFlow>
    </div>
  );
}
