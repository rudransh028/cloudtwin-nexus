from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ComponentSchema(BaseModel):
    id: str
    name: str
    type: str
    status: str
    region: Optional[str] = "ap-south-1"
    cpu: float
    memory: float
    requestRate: float
    errorRate: float
    latency: float
    replicas: Optional[int] = 2
    cost: float
    parentId: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class DependencySchema(BaseModel):
    id: str
    sourceId: str
    targetId: str
    type: Optional[str] = "http"
    protocol: Optional[str] = "HTTP/1.1"
    latency: Optional[float] = 10.0
    traffic: Optional[float] = 100.0
    errorRate: Optional[float] = 0.0
    status: Optional[str] = "healthy"

class DashboardDataSchema(BaseModel):
    healthScore: int
    cpuAvg: float
    memoryAvg: float
    networkIn: int
    networkOut: int
    requestRate: int
    errorRate: float
    avgLatency: int
    activeServices: int
    podCount: int
    containerCount: int
    nodeCount: int
    estimatedCost: int
    sla: float
    securityScore: int
    riskScore: int
    status: str

class SimulationMutation(BaseModel):
    type: str
    componentId: Optional[str] = None
    value: Optional[float] = None

class SimulationScenario(BaseModel):
    name: str
    trafficMultiplier: Optional[float] = 1.0
    mutations: Optional[List[SimulationMutation]] = []
    injectedFailures: Optional[List[str]] = []
    infraChanges: Optional[List[str]] = []

class ComponentSimResult(BaseModel):
    id: str
    name: str
    statusBefore: str
    statusAfter: str
    latencyBefore: float
    latencyAfter: float
    cpuBefore: float
    cpuAfter: float
    errorRateBefore: float
    errorRateAfter: float

class SimulationResultSchema(BaseModel):
    id: str
    name: str
    status: str
    overallHealthBefore: str
    overallHealthAfter: str
    latencyBefore: float
    latencyAfter: float
    slaBefore: float
    slaAfter: float
    costBefore: float
    costAfter: float
    requestRateBefore: float
    requestRateAfter: float
    affectedUsersPercent: float
    bottleneck: str
    components: List[ComponentSimResult]
    recommendations: List[str]
    insights: Optional[List[str]] = []
    timestamp: str

class FindingSchema(BaseModel):
    id: str
    category: str
    severity: str
    title: str
    description: str
    componentId: Optional[str] = None
    affectedArea: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    status: Optional[str] = "open"

class PredictionSchema(BaseModel):
    id: str
    title: str
    severity: str
    timeToImpact: str
    confidence: float
    description: str
    componentId: Optional[str] = None
    trendData: Optional[List[float]] = []

class KubernetesNodeSchema(BaseModel):
    id: str
    name: str
    status: str
    cpuUsage: float
    memoryUsage: float
    podCount: int

class KubernetesPodSchema(BaseModel):
    id: str
    name: str
    namespace: str
    node: str
    status: str
    restarts: int
    cpuUsage: float
    memoryUsage: float

class OptimizerRequest(BaseModel):
    expectedUsers: int = 50000
    maxLatencyMs: int = 100
    minSla: float = 99.9
    monthlyBudget: int = 20000
