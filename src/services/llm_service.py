import json
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from src.config.settings import settings
from src.models.schemas import (
    LocationData,
    WeatherData,
    SoilData,
    CropInput,
    YieldPrediction,
    Optimization,
    ProductRecommendation,
)
from src.utils.image_search import ProductSearcher


class LLMService:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=settings.GOOGLE_API_KEY,
            temperature=0.3,
        )
        self.product_searcher = ProductSearcher()

    def _parse_json_response(self, content: str) -> dict | list:
        content = content.strip()
        if "```" in content:
            parts = content.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                try:
                    return json.loads(part)
                except json.JSONDecodeError:
                    continue
        return json.loads(content)

    async def analyze_soil_from_location(
        self, location: LocationData, weather: WeatherData
    ) -> SoilData:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert agronomist and soil scientist with deep knowledge of global soil patterns.
            Based on the exact location coordinates and weather data, analyze the likely soil characteristics.
            Use your knowledge of:
            - Regional geology and parent rock materials
            - Climate influence on soil formation
            - Historical agricultural data for the region
            - Typical soil surveys for the area
            
            Return your analysis as a JSON object with these exact keys:
            - soil_type: string (e.g., "Loamy", "Clay", "Sandy", "Silt", "Alluvial", "Red Soil", "Black Cotton Soil")
            - ph_level: float (between 4.0 and 9.0)
            - nitrogen: float (kg/ha, typically 100-400)
            - phosphorus: float (kg/ha, typically 10-80)
            - potassium: float (kg/ha, typically 100-500)
            - organic_matter: float (percentage, typically 1-8)
            
            Be specific to the exact location provided.
            Return ONLY the JSON object, no other text."""),
            ("human", """Analyze soil for this EXACT location:
            
            Coordinates: {lat}, {lon}
            City: {city}
            Region/State: {region}
            Country: {country}
            
            Current Weather Conditions:
            Temperature: {temp}C
            Humidity: {humidity}%
            Precipitation: {precip}mm
            Soil Moisture: {soil_moisture}
            
            Provide accurate soil analysis for this specific location.""")
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "lat": location.latitude,
            "lon": location.longitude,
            "city": location.city or "Unknown",
            "region": location.region or "Unknown",
            "country": location.country or "Unknown",
            "temp": weather.temperature_avg,
            "humidity": weather.humidity,
            "precip": weather.precipitation,
            "soil_moisture": weather.soil_moisture or "Unknown",
        })

        data = self._parse_json_response(response.content)
        return SoilData(**data)

    async def predict_yield(
        self,
        location: LocationData,
        weather: WeatherData,
        soil: SoilData,
        crop_input: CropInput,
    ) -> YieldPrediction:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert agricultural data scientist specializing in crop yield prediction.
            Analyze all provided data and predict the crop yield with scientific accuracy.
            
            Consider:
            - Local climate conditions and their suitability for the crop
            - Soil quality and nutrient availability
            - Regional agricultural patterns and typical yields
            - Crop-specific requirements and growth patterns
            - Irrigation method efficiency
            - Previous crop effects on soil
            
            Return your prediction as a JSON object with these exact keys:
            - crop_name: string
            - predicted_yield_kg_per_hectare: float (be realistic for the region)
            - confidence_level: string ("High", "Medium", "Low")
            - growing_season_days: integer
            - risk_factors: array of strings (specific risks for this location/crop combination)
            - yield_range_min: float
            - yield_range_max: float
            - optimal_harvest_window: string (e.g., "Mid-March to Early April")
            
            Return ONLY the JSON object, no other text."""),
            ("human", """Predict yield for:
            
            CROP DETAILS:
            Crop: {crop_name}
            Field Size: {field_size} hectares
            Planting Date: {planting_date}
            Irrigation: {irrigation}
            Previous Crop: {previous_crop}
            Farmer Experience: {experience}
            Budget Level: {budget}
            
            LOCATION:
            Coordinates: {lat}, {lon}
            City: {city}
            Region: {region}
            Country: {country}
            
            WEATHER CONDITIONS:
            Temperature: {temp_avg}C (Min: {temp_min}C, Max: {temp_max}C)
            Humidity: {humidity}%
            Precipitation: {precip}mm
            Wind Speed: {wind}km/h
            UV Index: {uv}
            
            SOIL ANALYSIS:
            Type: {soil_type}
            pH: {ph}
            Nitrogen: {nitrogen} kg/ha
            Phosphorus: {phosphorus} kg/ha
            Potassium: {potassium} kg/ha
            Organic Matter: {organic}%
            
            Provide accurate yield prediction based on all this data.""")
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "crop_name": crop_input.crop_name,
            "field_size": crop_input.field_size_hectares,
            "planting_date": crop_input.planting_date or "Current season",
            "irrigation": crop_input.irrigation_type or "Not specified",
            "previous_crop": crop_input.previous_crop or "Not specified",
            "experience": crop_input.farming_experience or "Not specified",
            "budget": crop_input.budget_level or "Not specified",
            "lat": location.latitude,
            "lon": location.longitude,
            "city": location.city or "Unknown",
            "region": location.region or "Unknown",
            "country": location.country or "Unknown",
            "temp_avg": weather.temperature_avg,
            "temp_min": weather.temperature_min,
            "temp_max": weather.temperature_max,
            "humidity": weather.humidity,
            "precip": weather.precipitation,
            "wind": weather.wind_speed,
            "uv": weather.uv_index or "Unknown",
            "soil_type": soil.soil_type,
            "ph": soil.ph_level,
            "nitrogen": soil.nitrogen,
            "phosphorus": soil.phosphorus,
            "potassium": soil.potassium,
            "organic": soil.organic_matter,
        })

        data = self._parse_json_response(response.content)
        return YieldPrediction(**data)

    async def generate_optimizations(
        self,
        location: LocationData,
        weather: WeatherData,
        soil: SoilData,
        crop_input: CropInput,
        yield_prediction: YieldPrediction,
    ) -> list[Optimization]:
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert agricultural consultant providing optimization recommendations.
            Analyze the data and yield prediction to provide actionable optimizations.
            
            IMPORTANT:
            - Recommend products that are ACTUALLY AVAILABLE in {country}
            - Use product names from brands that operate in {country}
            - Consider local agricultural practices and regulations
            - Provide realistic application rates for the region
            
            For India, use brands like: Tata Rallis, UPL, Bayer India, Syngenta India, IFFCO, Coromandel, Zuari Agro
            For USA, use brands like: Scotts, Miracle-Gro, Bayer, Ortho, Spectracide
            
            Return a JSON array of optimization objects with these keys:
            - category: string (e.g., "Fertilization", "Pest Control", "Irrigation", "Soil Management", "Seed Treatment")
            - recommendation: string (detailed, actionable recommendation)
            - expected_improvement: string (expected yield improvement percentage or description)
            - priority: string ("High", "Medium", "Low")
            - products: array of objects with:
              - name: string (REAL product name available in the region)
              - type: string (fertilizer, pesticide, herbicide, fungicide, etc.)
              - description: string (what it does and why it's recommended)
              - application_rate: string (specific dosage and timing)
            
            Provide 4-6 comprehensive optimizations with 1-2 real product recommendations each.
            Return ONLY the JSON array, no other text."""),
            ("human", """Generate optimizations for:
            
            CROP: {crop_name} on {field_size} hectares
            PREDICTED YIELD: {predicted_yield} kg/ha
            CONFIDENCE: {confidence}
            RISK FACTORS: {risks}
            
            LOCATION: {city}, {region}, {country}
            Coordinates: {lat}, {lon}
            
            WEATHER:
            Temperature: {temp_avg}C
            Humidity: {humidity}%
            Precipitation: {precip}mm
            
            SOIL:
            Type: {soil_type}
            pH: {ph}
            N-P-K: {nitrogen}-{phosphorus}-{potassium}
            Organic Matter: {organic}%
            
            FARMER DETAILS:
            Experience: {experience}
            Budget: {budget}
            
            Provide specific optimization recommendations with products available in {country}.""")
        ])

        chain = prompt | self.llm
        response = await chain.ainvoke({
            "crop_name": crop_input.crop_name,
            "field_size": crop_input.field_size_hectares,
            "predicted_yield": yield_prediction.predicted_yield_kg_per_hectare,
            "confidence": yield_prediction.confidence_level,
            "risks": ", ".join(yield_prediction.risk_factors) if yield_prediction.risk_factors else "None identified",
            "city": location.city or "Unknown",
            "region": location.region or "Unknown",
            "country": location.country or "Unknown",
            "lat": location.latitude,
            "lon": location.longitude,
            "temp_avg": weather.temperature_avg,
            "humidity": weather.humidity,
            "precip": weather.precipitation,
            "soil_type": soil.soil_type,
            "ph": soil.ph_level,
            "nitrogen": soil.nitrogen,
            "phosphorus": soil.phosphorus,
            "potassium": soil.potassium,
            "organic": soil.organic_matter,
            "experience": crop_input.farming_experience or "Not specified",
            "budget": crop_input.budget_level or "Not specified",
        })

        optimizations_data = self._parse_json_response(response.content)
        optimizations = []

        for opt_data in optimizations_data:
            products = []
            for prod in opt_data.get("products", []):
                product_info = await self.product_searcher.get_product_info(
                    prod["name"], 
                    prod["type"],
                    country_code=location.country_code or "IN",
                    country=location.country or "India",
                    region=location.region or ""
                )
                products.append(ProductRecommendation(
                    name=prod["name"],
                    type=prod["type"],
                    description=prod.get("description", ""),
                    application_rate=prod.get("application_rate", ""),
                    purchase_link=product_info.get("purchase_link", ""),
                    image_url=product_info.get("image_url", ""),
                    price_range=product_info.get("price_range", ""),
                ))
            
            optimizations.append(Optimization(
                category=opt_data["category"],
                recommendation=opt_data["recommendation"],
                expected_improvement=opt_data["expected_improvement"],
                priority=opt_data.get("priority", "Medium"),
                products=products,
            ))

        return optimizations
