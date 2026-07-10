from fastapi import FastAPI
from sqlalchemy import text
from app.db.postgres import engine

app = FastAPI(
    title="NetShield AI",
    description="Network Anomaly Detection & Threat Monitoring System API",
    version="0.1.0",
)


@app.get("/")
def read_root():
    return {"message": "NetShield AI backend is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/db")
def db_health_check():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "connected"}
    except Exception as e:
        return {"database": "error", "detail": str(e)}