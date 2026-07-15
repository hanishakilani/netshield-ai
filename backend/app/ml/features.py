import os
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

PROCESSED_PATH = "datasets/processed/cicids2017_processed.csv"
ARTIFACTS_DIR = "datasets/processed/model_artifacts"

NON_FEATURE_COLUMNS = ["Label", "is_attack"]


def load_dataset() -> pd.DataFrame:
    print("Loading processed CICIDS2017 dataset...")
    df = pd.read_csv(PROCESSED_PATH, low_memory=False)
    print(f"Loaded shape: {df.shape}")
    return df


def build_feature_matrix(df: pd.DataFrame):
    feature_columns = [c for c in df.columns if c not in NON_FEATURE_COLUMNS]
    X = df[feature_columns].copy()
    y = df["is_attack"].copy()

    # Safety net in case any inf/NaN slipped through preprocessing
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.fillna(X.median(numeric_only=True), inplace=True)

    return X, y, feature_columns


def split_and_scale(X, y, test_size=0.2, random_state=42):
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=random_state
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return X_train_scaled, X_test_scaled, y_train, y_test, scaler


def prepare_and_save():
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)

    df = load_dataset()
    X, y, feature_columns = build_feature_matrix(df)

    print(f"Feature count: {len(feature_columns)}")
    print(f"Class balance:\n{y.value_counts(normalize=True)}")

    X_train, X_test, y_train, y_test, scaler = split_and_scale(X, y)

    np.save(os.path.join(ARTIFACTS_DIR, "X_train.npy"), X_train)
    np.save(os.path.join(ARTIFACTS_DIR, "X_test.npy"), X_test)
    np.save(os.path.join(ARTIFACTS_DIR, "y_train.npy"), y_train.values)
    np.save(os.path.join(ARTIFACTS_DIR, "y_test.npy"), y_test.values)
    joblib.dump(scaler, os.path.join(ARTIFACTS_DIR, "scaler.joblib"))
    joblib.dump(feature_columns, os.path.join(ARTIFACTS_DIR, "feature_columns.joblib"))

    print(f"\nSaved train/test splits and scaler to {ARTIFACTS_DIR}")
    print(f"X_train: {X_train.shape}, X_test: {X_test.shape}")


if __name__ == "__main__":
    prepare_and_save()