import {
  DashboardData,
  Component,
  Dependency,
  TopologyNode,
  TopologyEdge,
  AnalysisFinding,
  FailurePrediction,
  Architecture,
  KubernetesNode,
  KubernetesPod,
  GeoRegion,
  CostBreakdown,
  CostOptimization,
  NetworkPath,
  SimulationResult
} from '@/lib/types';

export const mockDashboard: DashboardData = {
  healthScore: 84,
  cpuAvg: 67,
  memoryAvg: 72,
  networkIn: 245000000,
  networkOut: 189000000,
  requestRate: 4850,
  errorRate: 0.3,
  avgLatency: 95,
  activeServices: 8,
  podCount: 14,
  containerCount: 18,
  nodeCount: 3,
  estimatedCost: 18500,
  sla: 99.87,
  securityScore: 78,
  riskScore: 32,
  status: 'healthy'
};

export const mockComponents: Component[] = [
  { id: 'comp-users', name: 'Users', type: 'user', status: 'healthy', cpu: 0, memory: 0, requestRate: 5000, errorRate: 0, latency: 0, cost: 0 },
  { id: 'comp-lb', name: 'Load Balancer', type: 'load_balancer', status: 'healthy', cpu: 35, memory: 40, requestRate: 5000, errorRate: 0.1, latency: 5, cost: 850 },
  { id: 'comp-gw', name: 'API Gateway', type: 'gateway', status: 'healthy', cpu: 45, memory: 55, requestRate: 4950, errorRate: 0.2, latency: 12, cost: 1200 },
  { id: 'comp-frontend', name: 'Frontend Service', type: 'service', status: 'healthy', cpu: 55, memory: 60, requestRate: 1500, errorRate: 0.1, latency: 45, cost: 2100 },
  { id: 'comp-api', name: 'API Service', type: 'service', status: 'warning', cpu: 75, memory: 70, requestRate: 3450, errorRate: 0.8, latency: 85, cost: 2800 },
  { id: 'comp-auth', name: 'Auth Service', type: 'service', status: 'healthy', cpu: 30, memory: 40, requestRate: 3450, errorRate: 0.1, latency: 25, cost: 1500 },
  { id: 'comp-orders', name: 'Order Service', type: 'service', status: 'healthy', cpu: 65, memory: 65, requestRate: 850, errorRate: 0.5, latency: 110, cost: 2400 },
  { id: 'comp-worker', name: 'Worker', type: 'service', status: 'healthy', cpu: 40, memory: 80, requestRate: 120, errorRate: 0.05, latency: 350, cost: 1100 },
  { id: 'comp-redis', name: 'Redis Cache', type: 'cache', status: 'healthy', cpu: 35, memory: 75, requestRate: 6500, errorRate: 0.01, latency: 2, cost: 1600 },
  { id: 'comp-db-primary', name: 'PostgreSQL Primary', type: 'database', status: 'warning', cpu: 85, memory: 80, requestRate: 4200, errorRate: 0.2, latency: 15, cost: 3500 },
  { id: 'comp-db-replica', name: 'PostgreSQL Replica', type: 'database', status: 'healthy', cpu: 45, memory: 55, requestRate: 2100, errorRate: 0.1, latency: 18, cost: 1200 },
  { id: 'comp-s3', name: 'S3 Storage', type: 'storage', status: 'healthy', cpu: 10, memory: 15, requestRate: 350, errorRate: 0.02, latency: 45, cost: 250 }
];

export const mockDependencies: Dependency[] = [
  { id: 'dep-1', sourceId: 'comp-users', targetId: 'comp-lb', latency: 45, traffic: 5000, errorRate: 0.1, status: 'healthy' },
  { id: 'dep-2', sourceId: 'comp-lb', targetId: 'comp-gw', latency: 2, traffic: 4950, errorRate: 0.1, status: 'healthy' },
  { id: 'dep-3', sourceId: 'comp-gw', targetId: 'comp-frontend', latency: 8, traffic: 1500, errorRate: 0.1, status: 'healthy' },
  { id: 'dep-4', sourceId: 'comp-gw', targetId: 'comp-api', latency: 10, traffic: 3450, errorRate: 0.2, status: 'healthy' },
  { id: 'dep-5', sourceId: 'comp-api', targetId: 'comp-auth', latency: 5, traffic: 3450, errorRate: 0.1, status: 'healthy' },
  { id: 'dep-6', sourceId: 'comp-api', targetId: 'comp-orders', latency: 15, traffic: 850, errorRate: 0.5, status: 'warning' },
  { id: 'dep-7', sourceId: 'comp-api', targetId: 'comp-redis', latency: 1, traffic: 5200, errorRate: 0.01, status: 'healthy' },
  { id: 'dep-8', sourceId: 'comp-api', targetId: 'comp-db-primary', latency: 8, traffic: 2500, errorRate: 0.2, status: 'healthy' },
  { id: 'dep-9', sourceId: 'comp-orders', targetId: 'comp-db-primary', latency: 12, traffic: 1700, errorRate: 0.1, status: 'healthy' },
  { id: 'dep-10', sourceId: 'comp-orders', targetId: 'comp-worker', latency: 5, traffic: 120, errorRate: 0, status: 'healthy' },
  { id: 'dep-11', sourceId: 'comp-db-primary', targetId: 'comp-db-replica', latency: 2, traffic: 2100, errorRate: 0, status: 'healthy' },
  { id: 'dep-12', sourceId: 'comp-worker', targetId: 'comp-s3', latency: 25, traffic: 150, errorRate: 0.02, status: 'healthy' }
];

export const mockTopologyNodes: TopologyNode[] = mockComponents.map(comp => {
  let x = 0, y = 0;
  switch (comp.id) {
    case 'comp-users': x = 400; y = 0; break;
    case 'comp-lb': x = 400; y = 100; break;
    case 'comp-gw': x = 400; y = 200; break;
    case 'comp-frontend': x = 200; y = 300; break;
    case 'comp-api': x = 400; y = 300; break;
    case 'comp-auth': x = 600; y = 300; break;
    case 'comp-redis': x = 200; y = 420; break;
    case 'comp-orders': x = 400; y = 420; break;
    case 'comp-worker': x = 600; y = 420; break;
    case 'comp-db-primary': x = 300; y = 550; break;
    case 'comp-db-replica': x = 500; y = 550; break;
    case 'comp-s3': x = 700; y = 420; break;
  }
  return {
    id: comp.id,
    type: 'customNode',
    position: { x, y },
    data: comp
  };
});

export const mockTopologyEdges: TopologyEdge[] = mockDependencies.map(dep => ({
  id: dep.id,
  source: dep.sourceId,
  target: dep.targetId,
  animated: true,
  data: dep
}));

export function generateTimeSeriesData(hours: number, baseValue: number, variance: number, trend: number = 0): { time: string, value: number }[] {
  const data = [];
  const now = new Date();
  const intervals = hours * 60 / 5;
  for (let i = intervals; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 5 * 60000);
    const progress = 1 - (i / intervals);
    const randomVar = (Math.random() - 0.5) * 2 * variance;
    const trendEffect = trend * progress;
    data.push({
      time: time.toISOString(),
      value: Math.max(0, baseValue + randomVar + trendEffect)
    });
  }
  return data;
}

export const mockCpuHistory = generateTimeSeriesData(24, 60, 15, 10);
export const mockMemoryHistory = generateTimeSeriesData(24, 70, 8, 2);
export const mockRequestRateHistory = generateTimeSeriesData(24, 4500, 800, 350);
export const mockLatencyHistory = generateTimeSeriesData(24, 85, 20, 15);
export const mockErrorRateHistory = generateTimeSeriesData(24, 0.2, 0.15, 0.1);

export const mockFindings: AnalysisFinding[] = [
  { id: 'fnd-1', title: 'Database Single Point of Failure', severity: 'CRITICAL', category: 'reliability', description: 'Primary DB has no automatic failover', componentId: 'comp-db-primary' },
  { id: 'fnd-2', title: 'Database Publicly Accessible', severity: 'CRITICAL', category: 'security', description: 'DB endpoint exposed on public subnet', componentId: 'comp-db-primary' },
  { id: 'fnd-3', title: 'No Redis Replication', severity: 'HIGH', category: 'reliability', description: 'Cache failure would cascade', componentId: 'comp-redis' },
  { id: 'fnd-4', title: 'API Authentication Gaps', severity: 'HIGH', category: 'security', description: 'Some endpoints lack auth', componentId: 'comp-api' },
  { id: 'fnd-5', title: 'Database Overprovisioned', severity: 'MEDIUM', category: 'cost', description: '19% avg utilization', componentId: 'comp-db-replica' },
  { id: 'fnd-6', title: 'Single Region Deployment', severity: 'MEDIUM', category: 'architecture', description: 'No geo-redundancy' },
  { id: 'fnd-7', title: 'Missing HTTP/2', severity: 'LOW', category: 'performance', description: 'All traffic over HTTP/1.1', componentId: 'comp-gw' },
  { id: 'fnd-8', title: 'Container Image Vulnerabilities', severity: 'LOW', category: 'security', description: '3 CVEs found', componentId: 'comp-frontend' }
];

export const mockPredictions: FailurePrediction[] = [
  { id: 'pred-1', title: 'API degradation', severity: 'HIGH', timeToImpact: '10-15 min', confidence: 87, description: 'CPU trending up', componentId: 'comp-api', trendData: [55,62,70,78,84] },
  { id: 'pred-2', title: 'Database connection saturation', severity: 'MEDIUM', timeToImpact: '25-30 min', confidence: 72, description: 'Approaching connection limits', componentId: 'comp-db-primary' },
  { id: 'pred-3', title: 'Memory pressure on Node 2', severity: 'LOW', timeToImpact: '45-60 min', confidence: 58, description: 'Slow memory leak detected' }
];

export const mockArchitectures: Architecture[] = [
  { id: 'arch-current', name: 'Current Architecture', type: 'current', cost: 18500, sla: 99.87, latency: 95, securityScore: 78, reliabilityScore: 82, performanceScore: 85, costScore: 70 },
  { id: 'arch-ha', name: 'High Availability', type: 'proposed', cost: 32000, sla: 99.99, latency: 70, securityScore: 92, reliabilityScore: 98, performanceScore: 95, costScore: 40 },
  { id: 'arch-cost', name: 'Cost Optimized', type: 'proposed', cost: 12000, sla: 99.5, latency: 120, securityScore: 75, reliabilityScore: 72, performanceScore: 70, costScore: 95 }
];

export const mockKubernetesNodes: KubernetesNode[] = [
  { id: 'node-1', name: 'ip-10-0-1-45', status: 'Ready', cpuUsage: 68, memoryUsage: 74, podCount: 5 },
  { id: 'node-2', name: 'ip-10-0-2-112', status: 'Ready', cpuUsage: 82, memoryUsage: 88, podCount: 6 },
  { id: 'node-3', name: 'ip-10-0-3-88', status: 'Ready', cpuUsage: 45, memoryUsage: 55, podCount: 3 }
];

export const mockKubernetesPods: KubernetesPod[] = [
  { id: 'pod-1', name: 'frontend-7d6b9d5c5f-hx2v', namespace: 'default', node: 'node-1', status: 'Running', restarts: 0, cpuUsage: 25, memoryUsage: 35 },
  { id: 'pod-2', name: 'api-687489569-z8xc', namespace: 'default', node: 'node-2', status: 'Running', restarts: 2, cpuUsage: 78, memoryUsage: 65 },
  { id: 'pod-3', name: 'auth-5b68df4f5-9kjq', namespace: 'default', node: 'node-1', status: 'Running', restarts: 0, cpuUsage: 15, memoryUsage: 20 },
  { id: 'pod-4', name: 'orders-84b8d7dcc-2mlb', namespace: 'default', node: 'node-3', status: 'Running', restarts: 0, cpuUsage: 45, memoryUsage: 50 },
  { id: 'pod-5', name: 'worker-6cc65b4c4-p4vj', namespace: 'background', node: 'node-2', status: 'Running', restarts: 5, cpuUsage: 30, memoryUsage: 85 },
  { id: 'pod-6', name: 'redis-0', namespace: 'data', node: 'node-1', status: 'Running', restarts: 0, cpuUsage: 35, memoryUsage: 75 },
  { id: 'pod-7', name: 'postgres-0', namespace: 'data', node: 'node-2', status: 'Running', restarts: 0, cpuUsage: 85, memoryUsage: 80 },
  { id: 'pod-8', name: 'postgres-1', namespace: 'data', node: 'node-3', status: 'Running', restarts: 1, cpuUsage: 45, memoryUsage: 55 },
  { id: 'pod-9', name: 'frontend-7d6b9d5c5f-j9lk', namespace: 'default', node: 'node-3', status: 'Running', restarts: 0, cpuUsage: 22, memoryUsage: 32 },
  { id: 'pod-10', name: 'api-687489569-v3nm', namespace: 'default', node: 'node-1', status: 'Running', restarts: 1, cpuUsage: 72, memoryUsage: 68 },
  { id: 'pod-11', name: 'api-687489569-x5pq', namespace: 'default', node: 'node-2', status: 'CrashLoopBackOff', restarts: 12, cpuUsage: 0, memoryUsage: 0 },
  { id: 'pod-12', name: 'ingress-nginx-controller-6d4b45564-9k2n', namespace: 'ingress-nginx', node: 'node-1', status: 'Running', restarts: 0, cpuUsage: 45, memoryUsage: 55 },
  { id: 'pod-13', name: 'cert-manager-5d469c595f-p2kl', namespace: 'cert-manager', node: 'node-2', status: 'Running', restarts: 0, cpuUsage: 5, memoryUsage: 15 },
  { id: 'pod-14', name: 'prometheus-server-84f9b8c8d-6mvw', namespace: 'monitoring', node: 'node-2', status: 'Running', restarts: 0, cpuUsage: 65, memoryUsage: 78 }
];

export const mockGeoRegions: GeoRegion[] = [
  { id: 'region-mumbai', name: 'Mumbai', type: 'primary', latency: 25, status: 'healthy', userCount: 150000 },
  { id: 'region-singapore', name: 'Singapore', type: 'secondary', latency: 65, status: 'healthy', userCount: 85000 },
  { id: 'region-japan', name: 'Japan', type: 'secondary', latency: 95, status: 'healthy', userCount: 45000 },
  { id: 'region-us-east', name: 'US-East', type: 'edge', latency: 180, status: 'warning', userCount: 12000 },
  { id: 'region-eu-west', name: 'EU-West', type: 'edge', latency: 210, status: 'healthy', userCount: 8000 }
];

export const mockCostBreakdown: CostBreakdown[] = [
  { category: 'Compute', amount: 8500, percentage: 46 },
  { category: 'Database', amount: 4700, percentage: 25 },
  { category: 'Networking', amount: 3100, percentage: 17 },
  { category: 'Storage', amount: 1200, percentage: 6 },
  { category: 'Other', amount: 1000, percentage: 6 }
];

export const mockCostOptimizations: CostOptimization[] = [
  { id: 'opt-1', title: 'Downsize PostgreSQL Replica', description: 'Replica is consistently under 20% utilization', estimatedSavings: 600, effort: 'low' },
  { id: 'opt-2', title: 'Implement Spot Instances for Workers', description: 'Background workers can run on preemptible instances', estimatedSavings: 450, effort: 'medium' },
  { id: 'opt-3', title: 'Setup S3 Lifecycle Policies', description: 'Move older data to Glacier', estimatedSavings: 150, effort: 'low' },
  { id: 'opt-4', title: 'Consolidate Underutilized Nodes', description: 'Node 3 is running at 45% capacity during peak hours', estimatedSavings: 800, effort: 'high' }
];

export const mockNetworkPaths: NetworkPath[] = [
  { id: 'path-1', name: 'User to DB Read', hops: ['Users', 'Load Balancer', 'API Gateway', 'API Service', 'PostgreSQL Replica'], totalLatency: 42, status: 'healthy' },
  { id: 'path-2', name: 'User to DB Write', hops: ['Users', 'Load Balancer', 'API Gateway', 'API Service', 'PostgreSQL Primary'], totalLatency: 35, status: 'healthy' },
  { id: 'path-3', name: 'Checkout Flow', hops: ['Users', 'Load Balancer', 'API Gateway', 'API Service', 'Order Service', 'PostgreSQL Primary'], totalLatency: 147, status: 'warning' },
  { id: 'path-4', name: 'Background Processing', hops: ['Order Service', 'Worker', 'S3 Storage'], totalLatency: 380, status: 'healthy' }
];

export const mockSimulationResults: SimulationResult[] = [
  { id: 'sim-1', name: '10x Traffic Surge', description: 'Simulates a massive spike in user traffic (e.g., flash sale)', status: 'completed', metrics: { latency: 420, sla: 97.4, cost: 24000 }, insights: ['Database becomes critical bottleneck', 'API Gateway scales up but struggles with connections', 'Worker queue backs up significantly'] },
  { id: 'sim-2', name: 'Database Failure', description: 'Simulates the sudden failure of the primary PostgreSQL node', status: 'completed', metrics: { latency: 0, sla: 82.5, cost: 18500 }, insights: ['Cascading failure across API and Order services', '82% of users directly affected', 'No automatic failover configured'] }
];
