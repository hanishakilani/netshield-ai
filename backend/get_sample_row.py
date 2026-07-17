import json
import pandas as pd

CHUNK_SIZE = 50_000
PATH = "datasets/processed/cicids2017_processed.csv"


def find_attack_row():
    for chunk in pd.read_csv(PATH, chunksize=CHUNK_SIZE):
        attacks = chunk[chunk["is_attack"] == 1]
        if len(attacks) > 0:
            return attacks.iloc[0]
    raise RuntimeError("No attack rows found in the entire file")


if __name__ == "__main__":
    row = find_attack_row()
    feature_cols = [c for c in row.index if c not in ["Label", "is_attack"]]
    features = {c: float(row[c]) for c in feature_cols}
    print(json.dumps(features))