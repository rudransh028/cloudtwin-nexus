import {
  DashboardData,
  Component,
  Dependency,
  AnalysisFinding,
  FailurePrediction,
  Architecture,
  KubernetesNode,
  KubernetesPod,
  GeoRegion,
  CostBreakdown,
  CostOptimization,
  NetworkPath,
  SimulationResult,
  SimulationScenario
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
  mockGeoRegions,
  mockCostBreakdown,
  mockCostOptimizations,
  mockNetworkPaths,
  mockSimulationResults
} from '@/data/mockData';

const API_ORIGIN = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
console.log('[CloudTwin Nexus] API_ORIGIN resolved to:', API_ORIGIN);

class ApiService {
  private useRealApi: boolean = true;
  private baseUrl: string = `${API_ORIGIN}/api/v1`;

  async getDashboardData(): Promise<DashboardData> {
    if (this.useRealApi) {
      try {
        const res = await fetch(`${this.baseUrl}/dashboard`);
        if (res.ok) return await res.json();
      } catch (e) {
        console.warn('API fallback to mock data for dashboard', e);
      }
    }
    return Promise.resolve(mockDashboard);
  }

  async getComponents(): Promise<Component[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/components`);
      return res.json();
    }
    return Promise.resolve(mockComponents);
  }

  async getDependencies(): Promise<Dependency[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/dependencies`);
      return res.json();
    }
    return Promise.resolve(mockDependencies);
  }

  async getFindings(): Promise<AnalysisFinding[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/findings`);
      return res.json();
    }
    return Promise.resolve(mockFindings);
  }

  async getPredictions(): Promise<FailurePrediction[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/predictions`);
      return res.json();
    }
    return Promise.resolve(mockPredictions);
  }

  async getArchitectures(): Promise<Architecture[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/architectures`);
      return res.json();
    }
    return Promise.resolve(mockArchitectures);
  }

  async getKubernetesNodes(): Promise<KubernetesNode[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/kubernetes/nodes`);
      return res.json();
    }
    return Promise.resolve(mockKubernetesNodes);
  }

  async getKubernetesPods(): Promise<KubernetesPod[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/kubernetes/pods`);
      return res.json();
    }
    return Promise.resolve(mockKubernetesPods);
  }

  async getNetworkPaths(): Promise<NetworkPath[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/network/paths`);
      return res.json();
    }
    return Promise.resolve(mockNetworkPaths);
  }

  async getCostBreakdown(): Promise<CostBreakdown[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/cost/breakdown`);
      return res.json();
    }
    return Promise.resolve(mockCostBreakdown);
  }

  async getCostOptimizations(): Promise<CostOptimization[]> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/cost/optimizations`);
      return res.json();
    }
    return Promise.resolve(mockCostOptimizations);
  }

  async runSimulation(scenario: SimulationScenario): Promise<SimulationResult> {
    if (this.useRealApi) {
      const res = await fetch(`${this.baseUrl}/simulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });
      if (!res.ok) throw new Error("Backend unavailable");
      return res.json();
    }
    return Promise.resolve(mockSimulationResults[0]);
  }

  async checkHealth(): Promise<boolean> {
    if (!this.useRealApi) return false;
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
