import os
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/traffic", tags=["Traffic"])

PROCESSED_PATH = "datasets/processed/cicids2017_processed.csv"

_cache: dict = {"data": None}


def _compute_stats() -> dict:
    if not os.path.exists(PROCESSED_PATH):
        raise HTTPException(
            status_code=404,
            detail="Processed dataset not found. Run preprocessing first.",
        )

    df = pd.read_csv(PROCESSED_PATH, usecols=["Label", "is_attack"])

    total_flows = len(df)
    attack_count = int(df["is_attack"].sum())
    benign_count = total_flows - attack_count
    attack_percentage = round((attack_count / total_flows) * 100, 2)

    top_labels = df["Label"].value_counts().head(6).reset_index()
    top_labels.columns = ["label", "count"]

    return {
        "total_flows": total_flows,
        "benign_count": benign_count,
        "attack_count": attack_count,
        "attack_percentage": attack_percentage,
        "top_labels": top_labels.to_dict(orient="records"),
    }


@router.get("/stats")
def get_traffic_stats():
    if _cache["data"] is None:
        _cache["data"] = _compute_stats()
    return _cache["data"]