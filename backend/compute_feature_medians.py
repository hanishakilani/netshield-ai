import os
import joblib
import pandas as pd

PROCESSED_PATH = "datasets/processed/cicids2017_processed.csv"
ARTIFACTS_DIR = "datasets/processed/model_artifacts"
NON_FEATURE_COLUMNS = ["Label", "is_attack"]


def compute_and_save_medians():
    print("Loading processed dataset to compute feature medians...")
    df = pd.read_csv(PROCESSED_PATH, low_memory=False)
    feature_columns = [c for c in df.columns if c not in NON_FEATURE_COLUMNS]
    medians = df[feature_columns].median(numeric_only=True).to_dict()

    output_path = os.path.join(ARTIFACTS_DIR, "feature_medians.joblib")
    joblib.dump(medians, output_path)
    print(f"Saved {len(medians)} feature medians to {output_path}")


if __name__ == "__main__":
    compute_and_save_medians()