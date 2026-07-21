import os
import time
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

PROCESSED_PATH = "datasets/processed/cicids2017_processed.csv"
ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MIN_SAMPLES = 50

NON_FEATURE_COLUMNS = ["Label", "is_attack"]


def clean_label(label: str) -> str:
    return label.replace("\ufffd", "-").strip()


def load_attack_only_data() -> pd.DataFrame:
    print("Loading dataset and filtering to attack rows only...")
    df = pd.read_csv(PROCESSED_PATH, low_memory=False)
    df = df[df["is_attack"] == 1].copy()
    df["Label"] = df["Label"].apply(clean_label)
    print(f"Attack rows: {df.shape[0]:,}")
    return df


def group_rare_classes(df: pd.DataFrame) -> pd.DataFrame:
    counts = df["Label"].value_counts()
    rare_classes = counts[counts < MIN_SAMPLES].index.tolist()
    if rare_classes:
        print(f"Grouping rare classes into 'Other': {rare_classes}")
        df["Label"] = df["Label"].replace(rare_classes, "Other")
    return df


def prepare_multiclass_data():
    df = load_attack_only_data()
    df = group_rare_classes(df)

    print("\nFinal class distribution:")
    print(df["Label"].value_counts())

    feature_columns = [c for c in df.columns if c not in NON_FEATURE_COLUMNS]
    X = df[feature_columns].copy()
    X.replace([np.inf, -np.inf], np.nan, inplace=True)
    X.fillna(X.median(numeric_only=True), inplace=True)

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["Label"])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    return X_train_scaled, X_test_scaled, y_train, y_test, scaler, label_encoder, feature_columns


def train_and_evaluate_multiclass():
    X_train, X_test, y_train, y_test, scaler, label_encoder, feature_columns = prepare_multiclass_data()

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        class_weight="balanced",
        n_jobs=-1,
        random_state=42,
        verbose=1,
    )

    print("\nTraining multi-class attack classifier...")
    start = time.time()
    model.fit(X_train, y_train)
    print(f"Training completed in {time.time() - start:.1f} seconds")

    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nOverall accuracy: {accuracy:.4f}")
    print("\nClassification report:")
    print(classification_report(y_test, y_pred, target_names=label_encoder.classes_))

    joblib.dump(model, os.path.join(ARTIFACTS_DIR, "attack_type_model.joblib"))
    joblib.dump(scaler, os.path.join(ARTIFACTS_DIR, "attack_type_scaler.joblib"))
    joblib.dump(label_encoder, os.path.join(ARTIFACTS_DIR, "attack_type_label_encoder.joblib"))
    print(f"\nSaved multi-class model artifacts to {ARTIFACTS_DIR}")


if __name__ == "__main__":
    train_and_evaluate_multiclass()