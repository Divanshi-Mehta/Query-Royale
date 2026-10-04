from fastapi import FastAPI

from api.scheduling import router as scheduling_router


app = FastAPI(
    title="Query Royale API",
    description="OS + DBMS + AI Simulation Platform",
    version="1.0.0"
)


app.include_router(scheduling_router)


@app.get("/")
def root():
    return {
        "message": "Query Royale backend is running!",
        "status": "success"
    }