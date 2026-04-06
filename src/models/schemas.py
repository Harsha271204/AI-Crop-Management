from typing import Optional, TypedDict
from pydantic import BaseModel, Field


class LocationData(BaseModel):
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    address: Optional[str] = Field(None, description="Human readable address")
    city: Optional[str] = Field(None, description="City name")
    region: Optional[str] = Field(None, description="Region or state")
    country: Optional[str] = Field(None, description="Country name")
    country_code: Optional[str] = Field(None, description="Country code")


class WeatherData(BaseModel):
    temperature_avg: float = Field(..., description="Average temperature in Celsius")
    temperature_min: float = Field(..., description="Minimum temperature")
    temperature_max: float = Field(..., description="Maximum temperature")
    humidity: float = Field(..., description="Relative humidity percentage")
    precipitation: float = Field(..., description="Precipitation in mm")
    wind_speed: float = Field(..., description="Wind speed in km/h")
    soil_moisture: Optional[float] = Field(None, description="Soil moisture level")
    uv_index: Optional[float] = Field(None, description="UV index")
    weather_description: Optional[str] = Field(None, description="Weather description")


class SoilData(BaseModel):
    soil_type: str = Field(..., description="Type of soil")
    ph_level: float = Field(..., description="Soil pH level")
    nitrogen: float = Field(..., description="Nitrogen content")
    phosphorus: float = Field(..., description="Phosphorus content")
    potassium: float = Field(..., description="Potassium content")
    organic_matter: float = Field(..., description="Organic matter percentage")


class CropInput(BaseModel):
    crop_name: str = Field(..., description="Name of the crop")
    field_size_hectares: float = Field(..., description="Field size in hectares")
    planting_date: Optional[str] = Field(None, description="Planting date")
    irrigation_type: Optional[str] = Field(None, description="Type of irrigation")
    previous_crop: Optional[str] = Field(None, description="Previous crop grown")
    farming_experience: Optional[str] = Field(None, description="Farming experience level")
    budget_level: Optional[str] = Field(None, description="Budget level for inputs")


class ProductRecommendation(BaseModel):
    name: str = Field(..., description="Product name")
    type: str = Field(..., description="Product type like fertilizer, pesticide")
    description: str = Field(..., description="Product description")
    application_rate: str = Field(..., description="How to apply")
    purchase_link: str = Field(..., description="Link to purchase")
    image_url: str = Field(..., description="Product image URL")
    price_range: Optional[str] = Field(None, description="Approximate price range")


class Optimization(BaseModel):
    category: str = Field(..., description="Optimization category")
    recommendation: str = Field(..., description="Recommendation details")
    expected_improvement: str = Field(..., description="Expected yield improvement")
    priority: str = Field(default="Medium", description="Priority level")
    products: list[ProductRecommendation] = Field(default_factory=list)


class YieldPrediction(BaseModel):
    crop_name: str = Field(..., description="Crop name")
    predicted_yield_kg_per_hectare: float = Field(..., description="Predicted yield")
    confidence_level: str = Field(..., description="Prediction confidence")
    growing_season_days: int = Field(..., description="Expected growing days")
    risk_factors: list[str] = Field(default_factory=list)
    yield_range_min: float = Field(..., description="Minimum yield estimate")
    yield_range_max: float = Field(..., description="Maximum yield estimate")
    optimal_harvest_window: Optional[str] = Field(None, description="Best harvest period")


class PredictionRequest(BaseModel):
    latitude: float
    longitude: float
    crop_name: str
    field_size_hectares: float
    planting_date: Optional[str] = None
    irrigation_type: Optional[str] = None
    previous_crop: Optional[str] = None
    farming_experience: Optional[str] = None
    budget_level: Optional[str] = None


class PredictionResponse(BaseModel):
    success: bool
    location: Optional[LocationData] = None
    weather: Optional[WeatherData] = None
    soil: Optional[SoilData] = None
    yield_prediction: Optional[YieldPrediction] = None
    optimizations: list[Optimization] = Field(default_factory=list)
    messages: list[str] = Field(default_factory=list)
    error: Optional[str] = None


class AgentState(TypedDict):
    location: Optional[LocationData]
    weather: Optional[WeatherData]
    soil: Optional[SoilData]
    crop_input: Optional[CropInput]
    yield_prediction: Optional[YieldPrediction]
    optimizations: list[Optimization]
    messages: list[str]
    current_step: str
    error: Optional[str]
