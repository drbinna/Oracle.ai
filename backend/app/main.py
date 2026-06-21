from fastapi import FastAPI

from app.data import AGENTS, CHECKPOINTS, METRICS
from app.hud_env import describe_environment

app = FastAPI(
    title="Oracle.ai Backend",
    version="0.1.0",
    description="Backend service for the autonomous quant firm demo and runtime."
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/overview")
def overview() -> dict:
    return {
        "name": "Oracle.ai",
        "focus": "Filing-grounded RL for autonomous quant analysis",
        "architecture": "separated frontend and backend",
    }


@app.get("/api/agents")
def agents() -> list[dict]:
    return [agent.model_dump() for agent in AGENTS]


@app.get("/api/metrics")
def metrics() -> list[dict]:
    return [metric.model_dump() for metric in METRICS]


@app.get("/api/checkpoints")
def checkpoints() -> list[dict]:
    return [checkpoint.model_dump() for checkpoint in CHECKPOINTS]


@app.get("/api/environment")
def environment() -> dict:
    return describe_environment()
