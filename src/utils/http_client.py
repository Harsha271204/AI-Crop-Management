import httpx
from typing import Any, Optional


class HTTPClient:
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout

    async def get(
        self, 
        url: str, 
        params: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            return response.json()

    async def post(
        self,
        url: str,
        json_data: Optional[dict[str, Any]] = None,
        headers: Optional[dict[str, str]] = None,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=json_data, headers=headers)
            response.raise_for_status()
            return response.json()
