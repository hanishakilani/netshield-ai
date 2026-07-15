import os
import time
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "random_forest_model.joblib")


def load_training_data():
    X_train = np.load(os.path.join(ARTIFACTS_DIR, "X_train.npy"))
    y_train = np.load(os.path.join(ARTIFACTS_DIR, "y_train.npy"))
    return X_train, y_train


def train_random_forest(X_train, y_train) -> RandomForestClassifier:
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        n_jobs=-1,
        random_state=42,
        verbose=1,
    )

    print("Training Random Forest...")
    start = time.time()
    model.fit(X_train, y_train)
    elapsed = time.time() - start
    print(f"Training completed in {elapsed:.1f} seconds")

    return model


def train_and_save():
    X_train, y_train = load_training_data()
    print(f"Training on {X_train.shape[0]:,} samples, {X_train.shape[1]} features")

    model = train_random_forest(X_train, y_train)

    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train_and_save()