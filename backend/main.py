from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.scheduling import router as scheduling_router
from backend.api.dbms import router as dbms_router
from backend.api.system_metrics import router as metrics_router
from backend.api.ai_api import router as ai_router
from backend.database import get_db_type

app = FastAPI(
    title="Query Royale API",
    description="OS + DBMS + AI Simulation Platform Backend",
    version="1.0.0"
)

# Enable CORS for local dev servers (Vite at port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(scheduling_router)
app.include_router(dbms_router)
app.include_router(metrics_router)
app.include_router(ai_router)


@app.get("/")
def root():
    return {
        "message": "Query Royale backend is running!",
        "status": "success",
        "database_engine": get_db_type(),
        "docs_url": "/docs"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "database": get_db_type()
    }