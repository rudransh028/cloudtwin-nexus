import numpy as np
from typing import List, Dict, Any

class PredictionService:
    """
    Statistical trend analysis and anomaly detection engine.
    Calculates resource saturation velocity and predicts time to failure.
    """

    def analyze_metric_trajectory(self, data_points: List[float]) -> Dict[str, Any]:
        if len(data_points) < 2:
            return {"slope": 0.0, "is_critical": False}

        x = np.arange(len(data_points))
        y = np.array(data_points)
        slope, intercept = np.polyfit(x, y, 1)

        # Check if approaching 100% saturation
        current_val = data_points[-1]
        time_to_100 = (100.0 - current_val) / max(slope, 0.01) if slope > 0 else float("inf")

        return {
            "slope": float(slope),
            "current_value": float(current_val),
            "time_to_100_intervals": float(time_to_100),
            "is_critical": slope > 2.0 and current_val > 75.0
        }

    def get_active_predictions(self) -> List[Dict[str, Any]]:
        # Calculated from simulated telemetry trends
        api_cpu_trend = [55.0, 62.0, 70.0, 78.0, 84.0]
        db_conn_trend = [40.0, 52.0, 65.0, 74.0, 81.0]

        api_analysis = self.analyze_metric_trajectory(api_cpu_trend)
        
        predictions = [
            {
                "id": "pred-1",
                "title": "API Service Resource Degradation",
                "severity": "HIGH" if api_analysis["is_critical"] else "MEDIUM",
                "timeToImpact": "10-15 min",
                "confidence": 87.0,
                "description": f"CPU trajectory trending upward at +{api_analysis['slope']:.1f}% per 5-min interval. Connection queue backlog forming.",
                "componentId": "comp-api",
                "trendData": api_cpu_trend
            },
            {
                "id": "pred-2",
                "title": "PostgreSQL Connection Pool Saturation",
                "severity": "MEDIUM",
                "timeToImpact": "25-30 min",
                "confidence": 72.0,
                "description": "Active client pool approaching 85% of max_connections limit. Read replica diversion recommended.",
                "componentId": "comp-db-primary",
                "trendData": db_conn_trend
            },
            {
                "id": "pred-3",
                "title": "Worker Host Memory Exhaustion",
                "severity": "LOW",
                "timeToImpact": "45-60 min",
                "confidence": 58.0,
                "description": "Slow heap leak identified in background asynchronous processing worker container.",
                "componentId": "comp-worker",
                "trendData": [30.0, 34.0, 39.0, 44.0, 49.0]
            }
        ]
        return predictions

prediction_service = PredictionService()
