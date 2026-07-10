from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.db.postgres import engine
from app.db.mongodb import check_mongo_connection
from app.api.routes import auth, users, traffic

app = FastAPI(
    title="NetShield AI",
    description="Network Anomaly Detection & Threat Monitoring System API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(traffic.router)


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


@app.get("/health/mongo")
async def mongo_health_check():
    is_connected = await check_mongo_connection()
    if is_connected:
        return {"mongodb": "connected"}
    return {"mongodb": "error"}