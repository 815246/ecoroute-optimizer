"""
Shared pytest fixtures for EcoRoute Optimizer test suite.

Ensures deterministic execution, mocked external APIs (no network calls),
and common test clients.
"""

from __future__ import annotations

import sys
from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in python sys.path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Test client for API testing."""
    with TestClient(app) as test_client:
        yield test_client
