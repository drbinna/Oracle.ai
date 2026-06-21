from pydantic import BaseModel


class AgentStatus(BaseModel):
    name: str
    status: str


class RuntimeMetric(BaseModel):
    label: str
    value: str
    note: str


class CheckpointScore(BaseModel):
    name: str
    reward: float
