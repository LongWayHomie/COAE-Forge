"""Helper to build a consistent 'not implemented yet' router for pending tabs."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.common import StubRequest, StubResponse


def make_stub_router(tab: str, prefix: str, planned: list[str], message: str) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tab])

    @router.get("/info", response_model=StubResponse)
    def info() -> StubResponse:
        return StubResponse(tab=tab, message=message, planned=planned)

    @router.post("/run", response_model=StubResponse)
    def run(req: StubRequest) -> StubResponse:
        return StubResponse(tab=tab, message=message, planned=planned, echo=req.params)

    return router
