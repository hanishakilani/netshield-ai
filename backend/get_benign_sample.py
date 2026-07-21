import json
import pandas as pd

CHUNK_SIZE = 50_000
PATH = "datasets/processed/cicids2017_processed.csv"


def find_benign_row():
    for chunk in pd.read_csv(PATH, chunksize=CHUNK_SIZE):
        benign = chunk[chunk["is_attack"] == 0]
        if len(benign) > 0:
            return benign.iloc[0]
    raise RuntimeError("No benign rows found")


if __name__ == "__main__":
    row = find_benign_row()
    feature_cols = [c for c in row.index if c not in ["Label", "is_attack"]]
    features = {c: float(row[c]) for c in feature_cols}
    payload = {"features": features}

    with open("benign_sample.json", "w") as f:
        json.dump(payload, f, indent=2)

    print("Saved to benign_sample.json — already wrapped in the correct 'features' format")