import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    SERPER_API_KEY: str = os.getenv("SERPER_API_KEY", "")
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    SERPER_API_URL: str = "https://google.serper.dev"
    

settings = Settings()
