import os
import joblib
import numpy as np

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "random_forest_model.joblib")
SCALER_PATH = os.path.join(ARTIFACTS_DIR, "scaler.joblib")
FEATURE_COLUMNS_PATH = os.path.join(ARTIFACTS_DIR, "feature_columns.joblib")

ATTACK_TYPE_MODEL_PATH = os.path.join(ARTIFACTS_DIR, "attack_type_model.joblib")
ATTACK_TYPE_SCALER_PATH = os.path.join(ARTIFACTS_DIR, "attack_type_scaler.joblib")
ATTACK_TYPE_ENCODER_PATH = os.path.join(ARTIFACTS_DIR, "attack_type_label_encoder.joblib")

_model = None
_scaler = None
_feature_columns = None
_attack_type_model = None
_attack_type_scaler = None
_attack_type_encoder = None


def load_artifacts():
    global _model, _scaler, _feature_columns
    global _attack_type_model, _attack_type_scaler, _attack_type_encoder

    if _model is None:
        print("Loading model artifacts...")
        _model = joblib.load(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        _feature_columns = joblib.load(FEATURE_COLUMNS_PATH)

        _attack_type_model = joblib.load(ATTACK_TYPE_MODEL_PATH)
        _attack_type_scaler = joblib.load(ATTACK_TYPE_SCALER_PATH)
        _attack_type_encoder = joblib.load(ATTACK_TYPE_ENCODER_PATH)
        print(f"Models loaded. Expecting {len(_feature_columns)} features.")

    return _model, _scaler, _feature_columns


def get_feature_columns() -> list[str]:
    _, _, feature_columns = load_artifacts()
    return feature_columns


def compute_risk_level(risk_score: float) -> str:
    if risk_score >= 85:
        return "critical"
    elif risk_score >= 60:
        return "high"
    elif risk_score >= 30:
        return "medium"
    else:
        return "low"


def predict_attack_type(X_scaled: np.ndarray) -> dict:
    prediction_encoded = _attack_type_model.predict(X_scaled)[0]
    probabilities = _attack_type_model.predict_proba(X_scaled)[0]

    attack_type = _attack_type_encoder.inverse_transform([prediction_encoded])[0]
    type_confidence = float(probabilities[prediction_encoded])

    return {
        "attack_type": attack_type,
        "attack_type_confidence": type_confidence,
    }


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

    attack_probability = float(probabilities[1])
    risk_score = round(attack_probability * 100, 1)
    is_attack = bool(prediction == 1)

    result = {
        "prediction": "attack" if is_attack else "benign",
        "is_attack": is_attack,
        "confidence": float(probabilities[prediction]),
        "benign_probability": float(probabilities[0]),
        "attack_probability": attack_probability,
        "risk_score": risk_score,
        "risk_level": compute_risk_level(risk_score),
        "attack_type": None,
        "attack_type_confidence": None,
    }

    if is_attack:
        X_scaled_for_type = _attack_type_scaler.transform(X)
        type_result = predict_attack_type(X_scaled_for_type)
        result["attack_type"] = type_result["attack_type"]
        result["attack_type_confidence"] = type_result["attack_type_confidence"]

    return result