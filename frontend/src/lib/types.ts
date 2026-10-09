// ============================================================
// CloudTwin Nexus — TypeScript Type Definitions
// ============================================================

export type Status = 'healthy' | 'warning' | 'critical' | 'failed' | 'offline' | 'unknown' | 'degraded' | 'active' | 'success' | 'error' | 'inactive';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type ComponentType =
  | 'service'
  | 'pod'
  | 'node'
  | 'container'
  | 'database'
  | 'cache'
  | 'load_balancer'
  | 'gateway'
  | 'storage'
  | 'network'
  | 'region'
  | 'cluster'
  | 'user';

export interface Project {
  id: string;
  name: string;
  description: string;
  cloudProvider: string;
  status: Status;
  createdAt: string;
}

export interface Component {
  id: string;
  projectId?: string;
  name: string;
  type: ComponentType;
  status: Status;
  region?: string;
  cpu: number;
  memory: number;
  requestRate: number;
  errorRate: number;
  latency: number;
  replicas?: number;
  cost: number;
  parentId?: string;
  metadata?: Record<string, unknown>;
  metrics?: {
    cpu: number;
    memory: number;
    requestRate: number;
    latency: number;
    errorRate?: number;
  };
}

export interface Dependency {
  id: string;
  projectId?: string;
  sourceId: string;
  targetId: string;
  source?: string;
  target?: string;
  type?: string;
  protocol?: string;
  avgLatencyMs?: number;
  trafficRps?: number;
  latency?: number;
  traffic?: number;
  errorRate?: number;
  status?: Status;
}

export interface MetricPoint {
  time: string;
  value: number;
}

export interface MetricSeries {
  name: string;
  data: MetricPoint[];
  color?: string;
}

export interface DashboardData {
  healthScore: number;
  cpuAvg: number;
  memoryAvg: number;
  networkIn: number;
  networkOut: number;
  requestRate: number;
  errorRate: number;
  avgLatency: number;
  activeServices: number;
  podCount: number;
  containerCount: number;
  nodeCount: number;
  estimatedCost: number;
  sla: number;
  securityScore: number;
  riskScore: number;
  status: Status;
}

export interface TopologyNode {
  id: string;
  type?: string;
  name?: string;
  status?: Status;
  metrics?: {
    cpu: number;
    memory: number;
    requestRate: number;
    latency: number;
    errorRate?: number;
  };
  position: { x: number; y: number };
  data?: any;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  latencyMs?: number;
  latency?: number;
  trafficRps?: number;
  traffic?: number;
  protocol?: string;
  animated?: boolean;
  data?: any;
}

export interface SimulationMutation {
  type:
    | 'traffic_multiplier'
    | 'kill_component'
    | 'add_replica'
    | 'remove_replica'
    | 'increase_latency'
    | 'add_cache'
    | 'increase_cpu'
    | 'increase_memory'
    | 'add_region'
    | 'network_failure'
    | 'region_failure';
  componentId?: string;
  value?: number;
}

export interface SimulationScenario {
  name: string;
  trafficMultiplier?: number; injectedFailures?: string[]; infraChanges?: string[];
}

export interface ComponentSimResult {
  id: string;
  name: string;
  statusBefore: Status;
  statusAfter: Status;
  latencyBefore: number;
  latencyAfter: number;
  cpuBefore: number;
  cpuAfter: number;
  errorRateBefore: number;
  errorRateAfter: number;
}

export interface SimulationResult {
  id: string;
  name: string;
  description?: string;
  status: 'completed' | 'running' | 'failed';
  overallHealthBefore?: Status;
  overallHealthAfter?: Status;
  latencyBefore?: number;
  latencyAfter?: number;
  slaBefore?: number;
  slaAfter?: number;
  costBefore?: number;
  costAfter?: number;
  requestRateBefore?: number;
  requestRateAfter?: number;
  affectedUsersPercent?: number;
  bottleneck?: string;
  components?: ComponentSimResult[];
  recommendations?: string[];
  insights?: string[];
  metrics?: {
    latency: number;
    sla: number;
    cost: number;
  };
  timestamp?: string;
}

export interface AnalysisFinding {
  id: string;
  projectId?: string;
  category: 'security' | 'cost' | 'performance' | 'reliability' | 'architecture';
  severity: Severity;
  title: string;
  description: string;
  affectedComponents?: string[];
  componentId?: string;
  affectedArea?: string;
  impact?: string;
  recommendation?: string;
  estimatedImprovement?: Record<string, string>;
  status?: 'open' | 'acknowledged' | 'resolved' | 'ignored';
  timestamp?: string;
}

export interface FailurePrediction {
  id: string;
  componentId?: string;
  componentName?: string;
  title?: string;
  predictionType?: 'failure' | 'degradation' | 'saturation';
  severity: Severity;
  predictedIssue?: string;
  estimatedTime?: string;
  timeToImpact?: string;
  eta?: string;
  confidence: number;
  cause?: string;
  impact?: string;
  description?: string;
  trendData?: number[];
  status?: 'active' | 'resolved' | 'expired';
}

export interface Architecture {
  id: string;
  name: string;
  type?: string;
  description?: string;
  costMonthly?: number;
  cost?: number;
  estimatedSla?: number;
  sla?: number;
  avgLatencyMs?: number;
  latency?: number;
  securityScore?: number;
  scalabilityScore?: number;
  complexityScore?: number;
  resilienceScore?: number;
  reliabilityScore?: number;
  performanceScore?: number;
  costScore?: number;
  cloudProvider?: string;
  isCurrent?: boolean;
  meetsConstraints?: boolean;
  verdict?: 'PASS' | 'FAIL' | 'OVER_BUDGET';
}

export interface OptimizationConstraints {
  maxCostMonthly: number;
  minSla: number;
  maxLatencyMs: number;
  expectedUsers: number;
  numRegions?: number;
  requestsPerSec?: number;
}

export interface OptimizationCandidate {
  name: string;
  cost: number;
  sla: number;
  latency: number;
  verdict: 'PASS' | 'FAIL' | 'OVER_BUDGET';
  details: string;
  recommended?: boolean;
}

export interface HealthReport {
  id: string;
  title: string;
  overallScore: number;
  scores: {
    performance: number;
    security: number;
    reliability: number;
    costEfficiency: number;
    scalability: number;
  };
  findings: AnalysisFinding[];
  simulations: SimulationResult[];
  predictions: FailurePrediction[];
  timestamp: string;
}

export interface KubernetesNode {
  id: string;
  name: string;
  status: Status | 'Ready' | 'NotReady';
  cpu?: number;
  cpuUsage?: number;
  cpuCapacity?: number;
  memory?: number;
  memoryUsage?: number;
  memoryCapacity?: number;
  podCount: number;
  podCapacity?: number;
  conditions?: string[];
}

export interface KubernetesPod {
  id: string;
  name: string;
  namespace: string;
  nodeName?: string;
  node?: string;
  status: string;
  restarts: number;
  cpu?: number;
  cpuUsage?: number;
  memory?: number;
  memoryUsage?: number;
  age?: string;
  containers?: number;
}

export interface NetworkPath {
  id: string;
  name?: string;
  source?: string;
  target?: string;
  hops?: string[] | { name: string; latencyMs: number }[];
  totalLatencyMs?: number;
  totalLatency?: number;
  latency?: number;
  protocol?: string;
  status?: Status | 'optimal' | 'congested';
}

export interface GeoRegion {
  id: string;
  name: string;
  code?: string;
  type?: string;
  coordinates?: [number, number];
  latency: number;
  availability?: number;
  traffic?: number;
  errorRate?: number;
  userCount?: number;
  status: Status;
}

export interface CostBreakdown {
  category?: string;
  service?: string;
  cost?: number;
  amount?: number;
  percentage: number;
  trend?: 'up' | 'down' | 'stable';
  utilization?: number;
}

export interface CostOptimization {
  id: string;
  title: string;
  description?: string;
  currentCost?: number;
  optimizedCost?: number;
  savings?: number;
  estimatedSavings?: number;
  component?: string;
  reason?: string;
  action?: string;
  effort?: 'low' | 'medium' | 'high';
}

export interface TwinStatus {
  status: string;
  cluster?: string;
  region?: string;
  trackedComponents?: number;
  graphEdges?: number;
  driftPercent?: number;
  lastSyncedAt?: string;
  cadenceSeconds?: number;
  cloudMode?: string;
  kubernetesMode?: string;
  telemetryMode?: string;
}
