from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudTwin Nexus"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./cloudtwin.db"
    
    # Modes
    CLOUD_MODE: str = "mock"
    TELEMETRY_MODE: str = "mock"
    KUBERNETES_MODE: str = "mock"

    # Integrations
    PROMETHEUS_URL: Optional[str] = "http://localhost:9090"
    KUBERNETES_IN_CLUSTER: bool = False
    
    # AWS Config
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None

    # Telemetry interval in seconds
    TELEMETRY_INTERVAL: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
