from app.models import AgentStatus, CheckpointScore, RuntimeMetric


AGENTS = [
    AgentStatus(name="Research", status="Parsing MD&A drivers"),
    AgentStatus(name="Risk", status="Checking position constraints"),
    AgentStatus(name="Executor", status="Standing by for trade intent"),
    AgentStatus(name="Auditor", status="Verifying citations and claims"),
]

METRICS = [
    RuntimeMetric(label="Held-out score", value="0.74", note="Improved from 0.41 baseline"),
    RuntimeMetric(label="Rubric coverage", value="92%", note="Calculation, attribution, citation"),
    RuntimeMetric(label="Episodes", value="128", note="Sandbox training runs"),
]

CHECKPOINTS = [
    CheckpointScore(name="Baseline frontier", reward=0.41),
    CheckpointScore(name="Rejection-sampled SFT", reward=0.58),
    CheckpointScore(name="RL-tuned checkpoint", reward=0.74),
]
