from src.models.schemas import AgentState
from src.services.location_service import LocationService
from src.services.weather_service import WeatherService
from src.services.llm_service import LLMService


location_service = LocationService()
weather_service = WeatherService()
llm_service = LLMService()


async def fetch_location_node(state: AgentState) -> AgentState:
    try:
        location = state.get("location")
        if location:
            enriched_location = await location_service.get_location_context(
                location.latitude, location.longitude
            )
            state["location"] = enriched_location
            location_str = f"{enriched_location.city or ''}, {enriched_location.region or ''}, {enriched_location.country or ''}"
            state["messages"].append(f"Location identified: {location_str.strip(', ')}")
            state["current_step"] = "location_fetched"
    except Exception as e:
        state["error"] = f"Location fetch error: {str(e)}"
    return state


async def fetch_weather_node(state: AgentState) -> AgentState:
    try:
        location = state.get("location")
        if location:
            weather = await weather_service.get_current_weather(
                location.latitude, location.longitude
            )
            state["weather"] = weather
            state["messages"].append(
                f"Weather data: {weather.temperature_avg}C, {weather.humidity}% humidity, {weather.precipitation}mm precipitation"
            )
            state["current_step"] = "weather_fetched"
    except Exception as e:
        state["error"] = f"Weather fetch error: {str(e)}"
    return state


async def analyze_soil_node(state: AgentState) -> AgentState:
    try:
        location = state.get("location")
        weather = state.get("weather")
        if location and weather:
            soil = await llm_service.analyze_soil_from_location(location, weather)
            state["soil"] = soil
            state["messages"].append(
                f"Soil analysis: {soil.soil_type}, pH {soil.ph_level}, NPK: {soil.nitrogen:.0f}-{soil.phosphorus:.0f}-{soil.potassium:.0f}"
            )
            state["current_step"] = "soil_analyzed"
    except Exception as e:
        state["error"] = f"Soil analysis error: {str(e)}"
    return state


async def predict_yield_node(state: AgentState) -> AgentState:
    try:
        location = state.get("location")
        weather = state.get("weather")
        soil = state.get("soil")
        crop_input = state.get("crop_input")
        
        if all([location, weather, soil, crop_input]):
            prediction = await llm_service.predict_yield(
                location, weather, soil, crop_input
            )
            state["yield_prediction"] = prediction
            state["messages"].append(
                f"Yield prediction: {prediction.predicted_yield_kg_per_hectare:,.0f} kg/ha ({prediction.confidence_level} confidence)"
            )
            state["current_step"] = "yield_predicted"
    except Exception as e:
        state["error"] = f"Yield prediction error: {str(e)}"
    return state


async def generate_optimizations_node(state: AgentState) -> AgentState:
    try:
        location = state.get("location")
        weather = state.get("weather")
        soil = state.get("soil")
        crop_input = state.get("crop_input")
        yield_prediction = state.get("yield_prediction")
        
        if all([location, weather, soil, crop_input, yield_prediction]):
            optimizations = await llm_service.generate_optimizations(
                location, weather, soil, crop_input, yield_prediction
            )
            state["optimizations"] = optimizations
            state["messages"].append(f"Generated {len(optimizations)} optimization recommendations")
            state["current_step"] = "optimizations_generated"
    except Exception as e:
        state["error"] = f"Optimization generation error: {str(e)}"
    return state


def should_continue(state: AgentState) -> str:
    if state.get("error"):
        return "error"
    
    step = state.get("current_step", "")
    
    step_mapping = {
        "location_fetched": "fetch_weather",
        "weather_fetched": "analyze_soil",
        "soil_analyzed": "predict_yield",
        "yield_predicted": "generate_optimizations",
        "optimizations_generated": "complete",
    }
    
    return step_mapping.get(step, "complete")
