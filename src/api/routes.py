from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from src.models.schemas import PredictionRequest, PredictionResponse
from src.agents.crop_agent import CropPredictionAgent
from src.services.auth_service import AuthService
from src.services.data_service import DataService

router = APIRouter(prefix="/api/v1", tags=["predictions"])

agent = CropPredictionAgent()
auth_service = AuthService()
data_service = DataService()


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    email: str
    name: str


class UpdatePasswordRequest(BaseModel):
    email: str
    current_password: str
    new_password: str


class AuthResponse(BaseModel):
    success: bool
    user: Optional[dict] = None
    error: Optional[str] = None


class SavePredictionRequest(BaseModel):
    user_email: str
    prediction_data: dict


class UpdateSettingsRequest(BaseModel):
    user_email: str
    settings: dict


class UpdateProfileRequest(BaseModel):
    email: str
    name: str
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@router.post("/auth/login", response_model=AuthResponse)
async def login(request: LoginRequest) -> AuthResponse:
    user = auth_service.authenticate(request.email, request.password)
    if user:
        return AuthResponse(success=True, user=user)
    return AuthResponse(success=False, error="Invalid email or password")


@router.post("/auth/register")
async def register(request: RegisterRequest):
    result = auth_service.register_user(request.name, request.email, request.password)
    return result

@router.post("/auth/update-profile")
async def update_profile(request: UpdateProfileRequest):
    try:
        result = auth_service.update_user(request.email, {"name": request.name})
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/auth/update-password")
async def update_password(request: UpdatePasswordRequest):
    try:
        print(f"[DEBUG ROUTE] Updating password for {request.email}")
        print(f"[DEBUG ROUTE] Current password provided: {request.current_password}")
        print(f"[DEBUG ROUTE] New password provided: {request.new_password}")
        
        # Verify current password
        auth_result = auth_service.authenticate(request.email, request.current_password)
        print(f"[DEBUG ROUTE] Auth result: {auth_result}")
        
        if not auth_result:  # authenticate returns None on failure, not a dict
            return {"success": False, "error": "Current password is incorrect"}
        
        # Update to new password
        print(f"[DEBUG ROUTE] Calling update_user with new password")
        result = auth_service.update_user(request.email, {"password": request.new_password})
        print(f"[DEBUG ROUTE] Update result: {result}")
        return result
    except Exception as e:
        print(f"[DEBUG ROUTE] Exception: {str(e)}")
        return {"success": False, "error": str(e)}


@router.get("/auth/check-email/{email}")
async def check_email(email: str):
    user = auth_service.get_user_by_email(email)
    return {"exists": user is not None}


@router.post("/history/save")
async def save_prediction(request: SavePredictionRequest):
    result = data_service.save_prediction(request.user_email, request.prediction_data)
    return result


@router.get("/history/{user_email}")
async def get_history(user_email: str):
    predictions = data_service.get_user_predictions(user_email)
    return {"success": True, "predictions": predictions}


@router.delete("/history/{prediction_id}")
async def delete_prediction(prediction_id: str, user_email: str):
    success = data_service.delete_prediction(prediction_id, user_email)
    return {"success": success}


@router.get("/analytics/{user_email}")
async def get_analytics(user_email: str):
    analytics = data_service.get_user_analytics(user_email)
    return {"success": True, "analytics": analytics}


@router.get("/settings/{user_email}")
async def get_settings(user_email: str):
    settings = data_service.get_user_settings(user_email)
    return {"success": True, "settings": settings}


@router.post("/settings/update")
async def update_settings(request: UpdateSettingsRequest):
    success = data_service.update_user_settings(request.user_email, request.settings)
    return {"success": success}


@router.post("/profile/update")
async def update_profile(request: UpdateProfileRequest):
    user = auth_service.get_user_by_email(request.email)
    if not user:
        return {"success": False, "error": "User not found"}
    return {"success": True, "message": "Profile updated successfully"}


@router.post("/predict", response_model=PredictionResponse)
async def predict_yield(request: PredictionRequest) -> PredictionResponse:
    try:
        result = await agent.run(
            latitude=request.latitude,
            longitude=request.longitude,
            crop_name=request.crop_name,
            field_size_hectares=request.field_size_hectares,
            planting_date=request.planting_date,
            irrigation_type=request.irrigation_type,
            previous_crop=request.previous_crop,
            farming_experience=request.farming_experience,
            budget_level=request.budget_level,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "crop-prediction-api"}
