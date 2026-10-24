"""
FastAPI Application Entry Point for Highway Vehicle Tracking & Safety System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.api.endpoints import router as api_router
from backend.app.database.sqlite import init_db

app = FastAPI(
    title="Highway Vehicle Tracking & Safety System API",
    description="Intelligent Highway ITS backend with real-time speed monitoring, opposite-direction detection, and V2X scenario simulation.",
    version="1.0.0"
)

# Enable CORS for local dev and preview hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(api_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
