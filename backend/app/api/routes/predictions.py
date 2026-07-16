from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.ml.predict import predict_single, get_feature_columns

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