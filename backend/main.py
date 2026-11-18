from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.auth import router as auth_router
from backend.api.scheduling import router as scheduling_router
<<<<<<< HEAD
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
=======
from backend.database import init_db

# Ensure persistent database tables exist
init_db()

app = FastAPI(
    title="Query Royale API",
    description="OS + DBMS + AI Simulation Platform with 2FA Authentication",
    version="1.1.0",
)

# Enable CORS for frontend Vite development and production
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< HEAD
# Register routers directly
=======
app.include_router(auth_router)
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
app.include_router(scheduling_router)
app.include_router(dbms_router)
app.include_router(metrics_router)
app.include_router(ai_router)

# Also mount under /api prefix for unified client routing
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")
api_router.include_router(scheduling_router)
api_router.include_router(dbms_router)
api_router.include_router(metrics_router)
api_router.include_router(ai_router)

@app.get("/")
@api_router.get("/")
def root():
    return {
        "message": "Query Royale backend is running!",
        "status": "success",
<<<<<<< HEAD
        "database_engine": get_db_type(),
        "docs_url": "/docs"
    }


@app.get("/health")
@api_router.get("/health")
def health():
    return {
        "status": "healthy",
        "database": get_db_type()
    }

app.include_router(api_router)
=======
        "auth_available": True,
        "mfa_available": True,
    }
>>>>>>> d2d547e (feat: add login page with two-factor authentication (2FA) and backend integration)
