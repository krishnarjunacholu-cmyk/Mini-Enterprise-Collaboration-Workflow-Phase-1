"""
Main FastAPI application entry point.
Initializes the app, includes routers, and defines basic endpoints.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import Base, engine
from app.routers import approvals, auth, dashboard, tasks, users


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Actions to perform when the application starts and shuts down.
    """
    initialize_database()
    print(f"{settings.APP_NAME} v{settings.APP_VERSION} is starting...")
    print("Swagger UI available at: http://localhost:8000/docs")
    print("API Documentation: http://localhost:8000/redoc")
    yield
    print(f"{settings.APP_NAME} is shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Day 1: Backend Foundation with Authentication Module",
    lifespan=lifespan,
)

# ============================================================================
# CORS Configuration (Allow cross-origin requests)
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def initialize_database() -> None:
    """
    Create database tables if the configured database is reachable.

    Keep this out of module import so tests and tooling can import the app
    without needing a live MySQL connection.
    """
    try:
        Base.metadata.create_all(bind=engine)
        print("[OK] Database tables initialized successfully")
    except Exception as e:
        print(f"[WARN] Database connection failed: {e}")
        print("Make sure to:")
        print("   1. Have MySQL running")
        print("   2. Create database: CREATE DATABASE mini_enterprise_db;")
        print("   3. Update DATABASE_URL in .env with correct credentials")


# ============================================================================
# Include Routers
# ============================================================================
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(approvals.router)
app.include_router(dashboard.router)


# ============================================================================
# Root Endpoint
# ============================================================================
@app.get("/", tags=["Root"])
def read_root():
    """
    Root endpoint - verify API is running.

    Returns:
        dict: Welcome message with API status
    """
    return {
        "message": "Mini Enterprise Collaboration Workflow API is running",
        "version": settings.APP_VERSION,
        "docs": "/docs",  # Swagger UI documentation
    }


# ============================================================================
# Health Check Endpoint
# ============================================================================
@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint.
    Used for monitoring if the API is running.

    Returns:
        dict: Status information
    """
    return {
        "status": "healthy",
        "message": "API is healthy and running",
    }


if __name__ == "__main__":
    # This is for local testing only
    # In production, use: uvicorn app.main:app --host 0.0.0.0 --port 8000
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
