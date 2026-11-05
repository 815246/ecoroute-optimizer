"""Smoke test for /api/health endpoint."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_check_endpoint(client: TestClient) -> None:
    """Verify that /api/health returns 200 OK and expected status payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert data["traffic_label"] == "Simulated traffic, not live"
    assert data["data_mode_default"] in ["simulated", "real"]


def test_health_check_headers(client: TestClient) -> None:
    """Verify that process timing header is present."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert "X-Process-Time" in response.headers
