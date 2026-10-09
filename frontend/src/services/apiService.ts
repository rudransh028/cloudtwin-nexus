import {
  DashboardData,
  Component,
  Dependency,
  AnalysisFinding,
  FailurePrediction,
  Architecture,
  KubernetesNode,
  KubernetesPod,
  CostBreakdown,
  CostOptimization,
  NetworkPath,
  SimulationResult,
  SimulationScenario,
  TwinStatus
} from '@/lib/types';
import {
  mockDashboard,
  mockComponents,
  mockDependencies,
  mockFindings,
  mockPredictions,
  mockArchitectures,
  mockKubernetesNodes,
  mockKubernetesPods,
  mockCostBreakdown,
  mockCostOptimizations,
  mockNetworkPaths
} from '@/data/mockData';

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
console.log('[CloudTwin Nexus] API_ORIGIN resolved to:', API_ORIGIN);

export function mapCostRecommendationToInfraChange(opt: CostOptimization): string {
  const hay = `${opt.title} ${opt.action ?? ''} ${opt.description ?? ''} ${opt.reason ?? ''}`.toLowerCase();
  if (hay.includes('cache')) return 'Add Cache';
  if (hay.includes('spot')) return 'Spot Instances';
  if (hay.includes('lifecycle') || hay.includes('glacier') || (hay.includes('s3') && hay.includes('polic'))) {
    return 'S3 Lifecycle';
  }
  if (hay.includes('consolidat') || (hay.includes('node') && hay.includes('underutil'))) {
    return 'Consolidate Nodes';
  }
  if (hay.includes('downsize') || (hay.includes('replica') && (hay.includes('postgres') || hay.includes('database')))) {
    return 'Downsize DB Replica';
  }
  if (hay.includes('api') && hay.includes('replica')) return 'Add API Replica';
  return opt.action || 'Right-size underutilized capacity';
}

class ApiService {
  private baseUrl: string = `${API_ORIGIN}/api/v1`;

  get origin(): string {
    return API_ORIGIN;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, init);
    if (!res.ok) {
      let detail = '';
      try {
        const body = await res.json();
        detail = body?.detail ? `: ${typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail)}` : '';
      } catch {
        detail = '';
      }
      throw new Error(`Request failed (${res.status})${detail}`);
    }
    return res.json();
  }

  private async requestWithFallback<T>(path: string, fallback: T): Promise<T> {
    try {
      return await this.request<T>(path);
    } catch (e) {
      console.warn(`API fallback to mock data for ${path}`, e);
      return fallback;
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    return this.requestWithFallback('/dashboard', mockDashboard);
  }

  async getComponents(): Promise<Component[]> {
    return this.requestWithFallback('/components', mockComponents);
  }

  async getDependencies(): Promise<Dependency[]> {
    return this.requestWithFallback('/dependencies', mockDependencies);
  }

  async getFindings(): Promise<AnalysisFinding[]> {
    return this.requestWithFallback('/findings', mockFindings);
  }

  async getPredictions(): Promise<FailurePrediction[]> {
    return this.requestWithFallback('/predictions', mockPredictions);
  }

  async getArchitectures(): Promise<Architecture[]> {
    return this.requestWithFallback('/architectures', mockArchitectures);
  }

  async optimizeArchitecture(req: {
    expectedUsers: number;
    maxLatencyMs: number;
    minSla: number;
    monthlyBudget: number;
  }): Promise<Architecture[]> {
    return this.request<Architecture[]>('/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
  }

  async getKubernetesNodes(): Promise<KubernetesNode[]> {
    return this.requestWithFallback('/kubernetes/nodes', mockKubernetesNodes);
  }

  async getKubernetesPods(): Promise<KubernetesPod[]> {
    return this.requestWithFallback('/kubernetes/pods', mockKubernetesPods);
  }

  async getNetworkPaths(): Promise<NetworkPath[]> {
    return this.requestWithFallback('/network/paths', mockNetworkPaths);
  }

  async getCostBreakdown(): Promise<CostBreakdown[]> {
    return this.requestWithFallback('/cost/breakdown', mockCostBreakdown);
  }

  async getCostOptimizations(): Promise<CostOptimization[]> {
    return this.requestWithFallback('/cost/optimizations', mockCostOptimizations);
  }

  async getTwinStatus(): Promise<TwinStatus> {
    return this.request<TwinStatus>('/twin/status');
  }

  async runSimulation(scenario: SimulationScenario): Promise<SimulationResult> {
    return this.request<SimulationResult>('/simulations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario)
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_ORIGIN}/healthz`);
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
