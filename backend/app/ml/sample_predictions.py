import pandas as pd
from app.ml.predict import predict_single

PROCESSED_PATH = "datasets/processed/cicids2017_processed.csv"
SAMPLE_SIZE = 10


def get_sample_predictions() -> list[dict]:
    df = pd.read_csv(PROCESSED_PATH, nrows=50_000)
    sample = df.sample(n=SAMPLE_SIZE, random_state=None)

    feature_cols = [c for c in df.columns if c not in ["Label", "is_attack"]]
    results = []

    for _, row in sample.iterrows():
        features = {c: float(row[c]) for c in feature_cols}
        prediction = predict_single(features)
        prediction["actual_label"] = row["Label"]
        results.append(prediction)

    return results