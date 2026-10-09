import React, { useState, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ComponentNode from '@/components/architecture/ComponentNode';
import ComponentDetail from '@/components/architecture/ComponentDetail';
import { mockTopologyNodes, mockTopologyEdges, mockComponents } from '@/data/mockData';
import { Component } from '@/lib/types';

const nodeTypes = {
  custom: ComponentNode,
};

export default function ArchitecturePage() {
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
  const [view, setView] = useState<'logical' | 'kubernetes' | 'network'>('logical');

  const nodes = useMemo(() => {
    return mockTopologyNodes
      .filter(node => {
        const type = (node.data?.type || node.type || '') as string;
        if (view === 'kubernetes') {
          return ['service', 'pod', 'node', 'database', 'cache', 'container'].includes(type);
        }
        if (view === 'network') {
          return ['user', 'load_balancer', 'gateway', 'network', 'storage'].includes(type);
        }
        return true;
      })
      .map(node => ({
        ...node,
        type: 'custom',
      }));
  }, [view]);

  const visibleIds = useMemo(() => new Set(nodes.map(n => n.id)), [nodes]);

  const edges = useMemo(() => {
    return mockTopologyEdges
      .filter(edge => visibleIds.has(edge.source) && visibleIds.has(edge.target))
      .map(edge => {
      const edgeLatency = edge.latency ?? edge.latencyMs;
      return {
        ...edge,
        animated: true,
        style: { stroke: edgeLatency && edgeLatency > 50 ? '#f59e0b' : '#3b82f6', strokeWidth: 2 },
        label: edgeLatency ? `${edgeLatency}ms` : undefined,
        labelStyle: { fill: '#94a3b8', fontSize: 12 },
        labelBgStyle: { fill: '#1e293b' },
      };
    });
  }, [visibleIds]);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    const comp = mockComponents.find(c => c.id === node.id);
    if (comp) setSelectedComponent(comp);
  };

  return (
    <div className="h-full flex flex-col relative bg-slate-950">
      <div className="p-4 flex items-center justify-between z-10 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Live Architecture View</h1>
          <p className="text-sm text-slate-400">Real-time topology of your infrastructure</p>
        </div>
        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
          {(['logical', 'kubernetes', 'network'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm rounded-md capitalize transition-colors ${
                view === v ? 'bg-slate-700 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {v} View
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} />
          <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-b-slate-700 [&>button]:!text-slate-300 hover:[&>button]:!bg-slate-700" />
          <MiniMap className="!bg-slate-900 !border-slate-800" maskColor="rgba(15, 23, 42, 0.7)" nodeColor="#475569" />
        </ReactFlow>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg p-3 flex gap-4 text-xs z-10">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> <span className="text-slate-300">Healthy</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> <span className="text-slate-300">Warning/Degraded</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> <span className="text-slate-300">Critical</span></div>
        </div>
      </div>

      <ComponentDetail
        component={selectedComponent}
        onClose={() => setSelectedComponent(null)}
      />
    </div>
  );
}
