import os
import pandas as pd
import numpy as np

CICIDS_DIR = "datasets/cicids2017"
UNSW_TRAIN_PATH = "datasets/unsw-nb15/UNSW_NB15_training-set.csv"
UNSW_TEST_PATH = "datasets/unsw-nb15/UNSW_NB15_testing-set.csv"
PROCESSED_DIR = "datasets/processed"


def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [col.strip() for col in df.columns]
    return df


def load_and_clean_cicids() -> pd.DataFrame:
    print("Loading CICIDS2017 files...")
    csv_files = [f for f in os.listdir(CICIDS_DIR) if f.endswith(".csv")]

    dataframes = []
    for filename in csv_files:
        filepath = os.path.join(CICIDS_DIR, filename)
        df = pd.read_csv(filepath, low_memory=False)
        df = clean_column_names(df)
        dataframes.append(df)
        print(f"  Loaded {filename}: {df.shape}")

    combined = pd.concat(dataframes, ignore_index=True)
    print(f"Combined CICIDS2017 shape: {combined.shape}")

    combined.replace([np.inf, -np.inf], np.nan, inplace=True)

    numeric_cols = combined.select_dtypes(include=[np.number]).columns
    combined[numeric_cols] = combined[numeric_cols].fillna(combined[numeric_cols].median())

    combined["Label"] = combined["Label"].str.strip()
    combined["is_attack"] = (combined["Label"] != "BENIGN").astype(int)

    before = len(combined)
    combined.drop_duplicates(inplace=True)
    print(f"Dropped {before - len(combined)} duplicate rows")

    return combined


def load_and_clean_unsw() -> pd.DataFrame:
    print("\nLoading UNSW-NB15 files...")
    train = pd.read_csv(UNSW_TRAIN_PATH)
    test = pd.read_csv(UNSW_TEST_PATH)
    print(f"  Train shape: {train.shape}, Test shape: {test.shape}")

    combined = pd.concat([train, test], ignore_index=True)
    combined = clean_column_names(combined)

    combined.replace([np.inf, -np.inf], np.nan, inplace=True)

    numeric_cols = combined.select_dtypes(include=[np.number]).columns
    combined[numeric_cols] = combined[numeric_cols].fillna(combined[numeric_cols].median())

    combined["attack_cat"] = combined["attack_cat"].fillna("Normal").str.strip()
    combined["is_attack"] = combined["label"]

    before = len(combined)
    combined.drop_duplicates(inplace=True)
    print(f"Dropped {before - len(combined)} duplicate rows")

    print(f"Combined UNSW-NB15 shape: {combined.shape}")
    return combined


def save_processed(df: pd.DataFrame, filename: str):
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    output_path = os.path.join(PROCESSED_DIR, filename)
    df.to_csv(output_path, index=False)
    print(f"Saved: {output_path} ({df.shape[0]} rows, {df.shape[1]} columns)")


def run_preprocessing():
    cicids = load_and_clean_cicids()
    save_processed(cicids, "cicids2017_processed.csv")

    unsw = load_and_clean_unsw()
    save_processed(unsw, "unsw_nb15_processed.csv")

    print("\n=== Summary ===")
    print("CICIDS2017 attack distribution:")
    print(cicids["is_attack"].value_counts())
    print("\nUNSW-NB15 attack distribution:")
    print(unsw["is_attack"].value_counts())


if __name__ == "__main__":
    run_preprocessing()