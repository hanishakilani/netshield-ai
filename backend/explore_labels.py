import pandas as pd

df = pd.read_csv("datasets/processed/cicids2017_processed.csv", usecols=["Label"])
print("Full label distribution:")
print(df["Label"].value_counts())