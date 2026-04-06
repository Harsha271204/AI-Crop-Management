from src.utils.http_client import HTTPClient
from src.models.schemas import WeatherData
from src.config.settings import settings


class WeatherService:
    def __init__(self):
        self.http_client = HTTPClient()

    async def get_current_weather(
        self, latitude: float, longitude: float
    ) -> WeatherData:
        url = f"{settings.OPEN_METEO_BASE_URL}/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": [
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "wind_speed_10m",
            ],
            "daily": ["temperature_2m_max", "temperature_2m_min", "uv_index_max"],
            "hourly": ["soil_moisture_0_to_1cm"],
            "timezone": "auto",
        }

        data = await self.http_client.get(url, params)

        current = data.get("current", {})
        daily = data.get("daily", {})
        hourly = data.get("hourly", {})

        temp_max_list = daily.get("temperature_2m_max", [0])
        temp_min_list = daily.get("temperature_2m_min", [0])
        uv_list = daily.get("uv_index_max", [0])
        soil_list = hourly.get("soil_moisture_0_to_1cm", [0])

        return WeatherData(
            temperature_avg=current.get("temperature_2m", 0),
            temperature_min=temp_min_list[0] if temp_min_list else 0,
            temperature_max=temp_max_list[0] if temp_max_list else 0,
            humidity=current.get("relative_humidity_2m", 0),
            precipitation=current.get("precipitation", 0),
            wind_speed=current.get("wind_speed_10m", 0),
            soil_moisture=soil_list[0] if soil_list else None,
            uv_index=uv_list[0] if uv_list else None,
        )

    async def get_historical_weather(
        self, latitude: float, longitude: float, start_date: str, end_date: str
    ) -> dict:
        url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date,
            "end_date": end_date,
            "daily": [
                "temperature_2m_mean",
                "precipitation_sum",
                "relative_humidity_2m_mean",
            ],
            "timezone": "auto",
        }

        return await self.http_client.get(url, params)
