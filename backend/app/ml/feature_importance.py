import os
import json
import joblib
import pandas as pd

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "random_forest_model.joblib")
FEATURE_COLUMNS_PATH = os.path.join(ARTIFACTS_DIR, "feature_columns.joblib")
OUTPUT_PATH = os.path.join(ARTIFACTS_DIR, "feature_importance.json")

TOP_N = 15


def compute_feature_importance():
    model = joblib.load(MODEL_PATH)
    feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

    importances = model.feature_importances_
    df = pd.DataFrame({
        "feature": feature_columns,
        "importance": importances,
    }).sort_values("importance", ascending=False)

    top_features = df.head(TOP_N)

    print(f"\n=== Top {TOP_N} most important features ===")
    for _, row in top_features.iterrows():
        bar = "█" * int(row["importance"] * 200)
        print(f"{row['feature']:<35} {row['importance']:.4f} {bar}")

    top_share = top_features["importance"].sum()
    single_max = df["importance"].max()
    print(f"\nTop {TOP_N} features account for {top_share*100:.1f}% of total importance")
    print(f"Single most important feature: {single_max*100:.1f}% of total importance")

    if single_max > 0.5:
        print("\n⚠️  WARNING: one feature dominates — investigate possible data leakage")
    else:
        print("\n✅ No single feature dominates — importance is reasonably distributed")

    result = {
        "top_features": [
            {"feature": row["feature"], "importance": round(float(row["importance"]), 5)}
            for _, row in top_features.iterrows()
        ],
        "single_max_importance": round(float(single_max), 5),
    }
    with open(OUTPUT_PATH, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    compute_feature_importance()