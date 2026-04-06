from src.utils.http_client import HTTPClient
from src.models.schemas import LocationData
from src.config.settings import settings


class LocationService:
    def __init__(self):
        self.http_client = HTTPClient()

    async def reverse_geocode(self, latitude: float, longitude: float) -> LocationData:
        url = f"{settings.NOMINATIM_BASE_URL}/reverse"
        params = {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "addressdetails": 1,
            "accept-language": "en",
        }
        headers = {
            "User-Agent": "CropPredictionApp/1.0"
        }
        
        try:
            data = await self.http_client.get(url, params, headers)
            address = data.get("address", {})
            
            city = (
                address.get("city") or 
                address.get("town") or 
                address.get("village") or 
                address.get("municipality") or
                address.get("county")
            )
            
            region = (
                address.get("state") or 
                address.get("region") or 
                address.get("province")
            )
            
            return LocationData(
                latitude=latitude,
                longitude=longitude,
                address=data.get("display_name", ""),
                city=city,
                region=region,
                country=address.get("country", ""),
                country_code=address.get("country_code", "").upper(),
            )
        except Exception as e:
            return LocationData(
                latitude=latitude,
                longitude=longitude,
                address=None,
                city=None,
                region=None,
                country=None,
                country_code=None,
            )

    async def get_location_context(
        self, latitude: float, longitude: float
    ) -> LocationData:
        return await self.reverse_geocode(latitude, longitude)
