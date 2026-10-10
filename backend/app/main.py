from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api.dashboard import router as dashboard_router
from app.api.architecture import router as architecture_router
from app.api.simulation import router as simulation_router
from app.api.intelligence import router as intelligence_router
from app.api.website_monitor import router as website_monitor_router
from app.api.real_cloud import router as real_cloud_router
from app.websocket.telemetry_ws import router as ws_router

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Intelligent Digital Twin & Architecture Intelligence Platform for Cloud Infrastructure"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard_router, prefix=settings.API_PREFIX)
app.include_router(architecture_router, prefix=settings.API_PREFIX)
app.include_router(simulation_router, prefix=settings.API_PREFIX)
app.include_router(intelligence_router, prefix=settings.API_PREFIX)
app.include_router(website_monitor_router, prefix=settings.API_PREFIX)
app.include_router(real_cloud_router, prefix=settings.API_PREFIX)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {
        "platform": settings.PROJECT_NAME,
        "status": "operational",
        "version": settings.VERSION,
        "docs": "/docs"
    }

@app.get("/healthz")
async def health():
    return {"status": "ok"}
