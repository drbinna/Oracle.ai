"""
HUD environment scaffolding for the autonomous quant firm.

This stays backend-only so the UI never owns training or grading logic.
"""


def describe_environment() -> dict:
    return {
        "environment": "autonomous-quant-firm",
        "tools": [
            "sec_search",
            "read_filing",
            "compute_metric",
            "run_backtest",
        ],
        "hidden_graders": ["_grade_rubric"],
        "scenario": "analyze_filing",
    }
