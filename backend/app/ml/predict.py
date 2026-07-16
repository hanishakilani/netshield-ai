import os
import joblib
import numpy as np

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "random_forest_model.joblib")
SCALER_PATH = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
FEATURE_COLUMNS_PATH = os.path.join(ARTIFACTS_DIR, "feature_columns.joblib")

_model = None
_scaler = None
_feature_columns = None


def load_artifacts():
    global _model, _scaler, _feature_columns
    if _model is None:
        print("Loading model artifacts...")
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)
        print(f"Model loaded. Expecting {len(_feature_columns)} features.")
    return _model, _scaler, _feature_columns


def get_feature_columns() -> list[str]:
    _, _, feature_columns = load_artifacts()
    return feature_columns


def predict_single(features: dict) -> dict:
    model, scaler, feature_columns = load_artifacts()

    missing = [col for col in feature_columns if col not in features]
    if missing:
        raise ValueError(f"Missing required features: {missing[:5]}{'...' if len(missing) > 5 else ''}")

    ordered_values = [features[col] for col in feature_columns]
    X = np.array(ordered_values).reshape(1, -1)
    X_scaled = scaler.transform(X)

    prediction = model.predict(X_scaled)[0]
    probabilities = model.predict_proba(X_scaled)[0]

    return {
        "prediction": "attack" if prediction == 1 else "benign",
        "is_attack": bool(prediction == 1),
        "confidence": float(probabilities[prediction]),
        "benign_probability": float(probabilities[0]),
        "attack_probability": float(probabilities[1]),
    }