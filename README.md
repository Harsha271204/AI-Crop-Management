# AI-Powered Crop Yield Prediction & Optimization

An advanced agentic system for predicting crop yields and providing optimization recommendations using LangGraph, LangChain, and Google Gemini with a FastAPI backend and vanilla HTML/CSS/JS frontend.

## Architecture

```
src/
├── agents/                 # LangGraph agent definitions
│   ├── crop_agent.py      # Main agent orchestrator with state graph
│   └── nodes.py           # Individual processing nodes
├── api/                   # FastAPI REST API
│   ├── __init__.py
│   └── routes.py          # API endpoints
├── config/                # Configuration
│   └── settings.py        # Environment and API settings
├── frontend/              # Web interface
│   ├── index.html         # Main HTML page
│   └── static/
│       ├── css/
│       │   └── styles.css # Styling
│       └── js/
│           └── app.js     # Frontend application logic
├── models/                # Data models
│   └── schemas.py         # Pydantic schemas
├── services/              # Business logic services
│   ├── llm_service.py     # Google Gemini integration
│   ├── location_service.py # Geocoding with Nominatim
│   └── weather_service.py  # Open-Meteo weather API
└── utils/                 # Utilities
    ├── http_client.py     # Async HTTP client
    └── image_search.py    # Product search with regional links
```

## Agent Workflow

The system uses LangGraph for orchestrating an agentic pipeline:

1. **Location Node**: Reverse geocodes coordinates using Nominatim to get city, region, country
2. **Weather Node**: Fetches real-time weather from Open-Meteo API
3. **Soil Analysis Node**: LLM analyzes likely soil characteristics based on location
4. **Yield Prediction Node**: LLM predicts yield with confidence levels and risk factors
5. **Optimization Node**: Generates recommendations with region-specific product links

## Features

- Real-time location detection via browser Geolocation API
- Accurate reverse geocoding with Nominatim
- Live weather data integration from Open-Meteo
- AI-driven soil analysis based on geographical context
- Yield prediction with confidence levels and risk factors
- Region-specific product recommendations (India, USA, etc.)
- Real purchase links from Amazon, Flipkart, BigHaat, etc.
- Priority-based optimization recommendations
- Clean, responsive UI with vanilla HTML/CSS/JS

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Create a `.env` file:

```
GOOGLE_API_KEY=your_google_api_key
SERPER_API_KEY=optional_for_image_search
```

## Usage

### Web Application (Recommended)

```bash
python server.py
```

Then open http://localhost:8000 in your browser.

### Command Line Interface

```bash
python main.py
```

## API Endpoints

- `POST /api/v1/predict` - Submit prediction request
- `GET /api/v1/health` - Health check

## Technologies

- **Backend**: FastAPI, Uvicorn
- **AI/ML**: LangGraph, LangChain, Google Gemini 2.0 Flash
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **APIs**: Open-Meteo (weather), Nominatim (geocoding)
- **Data Validation**: Pydantic v2

## Input Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| latitude | Yes | Location latitude (-90 to 90) |
| longitude | Yes | Location longitude (-180 to 180) |
| crop_name | Yes | Name of the crop to grow |
| field_size_hectares | Yes | Field size in hectares |
| planting_date | No | Planned planting date |
| irrigation_type | No | Drip, Sprinkler, Flood, Rainfed, etc. |
| previous_crop | No | Previous crop grown on the field |
| farming_experience | No | Beginner, Intermediate, Experienced, Expert |
| budget_level | No | Low, Medium, High, Premium |

## Response Structure

```json
{
  "success": true,
  "location": {
    "latitude": 28.6139,
    "longitude": 77.209,
    "city": "New Delhi",
    "region": "Delhi",
    "country": "India",
    "country_code": "IN"
  },
  "weather": {
    "temperature_avg": 25.5,
    "humidity": 60,
    "precipitation": 0
  },
  "soil": {
    "soil_type": "Alluvial",
    "ph_level": 7.2,
    "nitrogen": 280,
    "phosphorus": 45,
    "potassium": 320
  },
  "yield_prediction": {
    "predicted_yield_kg_per_hectare": 4500,
    "confidence_level": "High",
    "risk_factors": ["Heat stress in summer"]
  },
  "optimizations": [
    {
      "category": "Fertilization",
      "recommendation": "Apply NPK 20-20-0...",
      "priority": "High",
      "products": [
        {
          "name": "IFFCO NPK 20-20-0",
          "purchase_link": "https://amazon.in/...",
          "image_url": "https://..."
        }
      ]
    }
  ]
}
```
