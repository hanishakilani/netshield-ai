import os
import json
import numpy as np
import joblib
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report,
)

ARTIFACTS_DIR = "datasets/processed/model_artifacts"
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "random_forest_model.joblib")
REPORT_PATH = os.path.join(ARTIFACTS_DIR, "evaluation_report.json")


def load_test_data():
    X_test = np.load(os.path.join(ARTIFACTS_DIR, "X_test.npy"))
    y_test = np.load(os.path.join(ARTIFACTS_DIR, "y_test.npy"))
    return X_test, y_test


def evaluate_model():
    model = joblib.load(MODEL_PATH)
    X_test, y_test = load_test_data()

    print(f"Evaluating on {X_test.shape[0]:,} held-out test samples...")
    y_pred = model.predict(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    tn, fp, fn, tp = cm.ravel()

    print("\n=== Evaluation Results ===")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")

    print("\n=== Confusion Matrix ===")
    print(f"True Negatives  (correctly flagged benign): {tn:,}")
    print(f"False Positives (benign flagged as attack): {fp:,}")
    print(f"False Negatives (attacks MISSED):           {fn:,}")
    print(f"True Positives  (attacks correctly caught):  {tp:,}")

    print("\n=== Full Classification Report ===")
    print(classification_report(y_test, y_pred, target_names=["Benign", "Attack"]))

    report = {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1_score": f1,
        "confusion_matrix": {
            "true_negatives": int(tn),
            "false_positives": int(fp),
            "false_negatives": int(fn),
            "true_positives": int(tp),
        },
        "test_samples": int(X_test.shape[0]),
    }
    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\nSaved evaluation report to {REPORT_PATH}")
    return report


if __name__ == "__main__":
    evaluate_model()