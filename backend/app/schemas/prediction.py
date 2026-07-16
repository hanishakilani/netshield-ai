from pydantic import BaseModel


class PredictionRequest(BaseModel):
    features: dict[str, float]


class PredictionResponse(BaseModel):
    prediction: str
    is_attack: bool
    confidence: float
    benign_probability: float
    attack_probability: float