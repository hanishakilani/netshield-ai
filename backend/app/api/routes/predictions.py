from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.ml.predict import predict_single, get_feature_columns
from app.ml.sample_predictions import get_sample_predictions
from app.ml.live_capture import run_live_capture

router = APIRouter(prefix="/predictions", tags=["Predictions"])


@router.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest, current_user: User = Depends(get_current_user)):
    try:
        result = predict_single(request.features)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/feature-schema")
def feature_schema(current_user: User = Depends(get_current_user)):
    return {"required_features": get_feature_columns()}


@router.get("/sample")
def sample_predictions(current_user: User = Depends(get_current_user)):
    return {"results": get_sample_predictions()}

@router.post("/live-capture")
def live_capture(duration: int = 8, current_user: User = Depends(get_current_user)):
    if duration < 3 or duration > 20:
        raise HTTPException(status_code=400, detail="Duration must be between 3 and 20 seconds")
    try:
        results = run_live_capture(duration)
    except PermissionError:
        raise HTTPException(
            status_code=500,
            detail="Packet capture requires administrator privileges. Restart the backend as Administrator.",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Live capture failed: {str(e)}")

    return {"results": results, "flow_count": len(results)}