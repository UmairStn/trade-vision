"""
Smoke & Validation Test for Model Evaluation.

Runs the evaluation pipeline across all CSE stocks or a single ticker.

Usage:
    python -m test.test_model_evaluation
    python -m test.test_model_evaluation JKH
"""

import sys
from ml.evaluate_model import run_evaluation

if __name__ == "__main__":
    ticker_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_evaluation(ticker_arg)
