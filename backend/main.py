"""
EcoRoute Optimizer — FastAPI application entry point.

Configures CORS, structured logging, global error handling, and mounts
all API routers. Run with:
    uvicorn main:app --reload
"""

from __future__ import annotations

import logging
import sys
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.analytics import router as analytics_router
from api.history import router as history_router
from api.routes import router as routes_router
from api.simulation import router as simulation_router
from api.vehicles import router as vehicles_router
from config import settings

# ── Structured logging ────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("ecoroute")


# ── Application lifespan ──────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    """Startup and shutdown lifecycle events."""
    logger.info("EcoRoute Optimizer starting up (version %s)", settings.APP_VERSION)
    settings.get_cache_dir()
    from database.db import init_db

    init_db()
    yield
    logger.info("EcoRoute Optimizer shutting down")


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description=(
        "Agentic multi-objective sustainable route planner. "
        "Traffic is **simulated**, not live. "
        "Emissions are estimates; accounting boundary stated per response."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handlers ─────────────────────────────────────────────────


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle standard HTTP exceptions with consistent error schema."""
    logger.warning("HTTP %d on %s: %s", exc.status_code, request.url.path, exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "code": f"HTTP_{exc.status_code}",
            "message": str(exc.detail),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Handle FastAPI / Pydantic validation errors."""
    logger.warning("Validation error on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "code": "VALIDATION_ERROR",
            "message": str(exc.errors()[0].get("msg") if exc.errors() else "Validation error"),
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    """Handle validation-style ValueErrors from domain logic."""
    logger.warning("ValueError on %s: %s", request.url.path, exc)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "code": "VALIDATION_ERROR",
            "message": str(exc),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all error handler; never expose raw stack traces to clients."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "code": "INTERNAL_ERROR",
            "message": "An unexpected error occurred. Please try again later.",
        },
    )


# ── Request timing middleware ─────────────────────────────────────────────────


@app.middleware("http")
async def add_process_time_header(request: Request, call_next: Any) -> Any:
    """Add X-Process-Time header to every HTTP response."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = time.perf_counter() - start
    response.headers["X-Process-Time"] = f"{elapsed:.4f}s"
    return response


# ── Health endpoint ───────────────────────────────────────────────────────────


@app.get(
    f"{settings.API_PREFIX}/health",
    tags=["System"],
    summary="Health check",
    response_model=dict[str, Any],
)
async def health_check() -> dict[str, Any]:
    """
    Returns service health and version information.

    Used by Docker health checks and monitoring. Does not check DB connection.
    """
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "data_mode_default": settings.DEFAULT_DATA_MODE,
        "traffic_label": "Simulated traffic, not live",
    }


# ── Mount API Routers ─────────────────────────────────────────────────────────

app.include_router(routes_router, prefix=settings.API_PREFIX)
app.include_router(vehicles_router, prefix=settings.API_PREFIX)
app.include_router(history_router, prefix=settings.API_PREFIX)
app.include_router(analytics_router, prefix=settings.API_PREFIX)
app.include_router(simulation_router, prefix=settings.API_PREFIX)
