import json
import httpx
from langchain_google_genai import ChatGoogleGenerativeAI
from src.config.settings import settings


class ProductSearcher:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            google_api_key=settings.GOOGLE_API_KEY,
        )
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def search_product_image(self, query: str) -> str:
        try:
            if settings.SERPER_API_KEY:
                headers = {
                    "X-API-KEY": settings.SERPER_API_KEY,
                    "Content-Type": "application/json"
                }
                payload = {"q": query, "num": 5}
                response = await self.http_client.post(
                    f"{settings.SERPER_API_URL}/images",
                    json=payload,
                    headers=headers
                )
                if response.status_code == 200:
                    data = response.json()
                    images = data.get("images", [])
                    if images:
                        return images[0].get("imageUrl", "")
        except Exception:
            pass
        return ""

    async def get_regional_purchase_link(
        self, 
        product_name: str, 
        product_type: str, 
        country_code: str,
        country: str,
        region: str
    ) -> dict:
        prompt = f"""You are an expert in agricultural products and e-commerce in {country}.

For the agricultural product: "{product_name}" (type: {product_type})
Location: {region}, {country} (Country Code: {country_code})

Provide a JSON response with REAL, WORKING purchase links and product information.

IMPORTANT RULES:
1. Use ONLY real e-commerce websites that operate in {country}
2. For India: Use Amazon.in, Flipkart, BigHaat, AgroStar, Bighaat.com, Ugaoo, IndiaMART
3. For USA: Use Amazon.com, HomeDepot, Tractor Supply Co, Walmart
4. For other countries: Use their local Amazon domain or popular local agricultural suppliers
5. The purchase link must be a REAL search URL that will show relevant products
6. Provide an accurate price range in local currency

Return ONLY this JSON format:
{{
    "purchase_link": "https://actual-website.com/search?q=product+name",
    "price_range": "price in local currency",
    "retailer_name": "name of the retailer"
}}

Do NOT include any text outside the JSON."""

        try:
            response = await self.llm.ainvoke(prompt)
            content = response.content.strip()
            
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
                content = content.strip()
            
            data = json.loads(content)
            return data
        except Exception:
            search_query = product_name.replace(" ", "+")
            if country_code == "IN":
                return {
                    "purchase_link": f"https://www.amazon.in/s?k={search_query}+agriculture",
                    "price_range": "Varies",
                    "retailer_name": "Amazon India"
                }
            elif country_code == "US":
                return {
                    "purchase_link": f"https://www.amazon.com/s?k={search_query}+agriculture",
                    "price_range": "Varies",
                    "retailer_name": "Amazon USA"
                }
            else:
                return {
                    "purchase_link": f"https://www.amazon.com/s?k={search_query}",
                    "price_range": "Varies",
                    "retailer_name": "Amazon"
                }

    async def get_product_info(
        self, 
        product_name: str, 
        product_type: str,
        country_code: str = "IN",
        country: str = "India",
        region: str = ""
    ) -> dict:
        purchase_info = await self.get_regional_purchase_link(
            product_name, product_type, country_code, country, region
        )
        
        image_query = f"{product_name} {product_type} agricultural product"
        image_url = await self.search_product_image(image_query)
        
        if not image_url:
            prompt = f"""Find a direct image URL for the agricultural product "{product_name}" which is a {product_type}.

The image URL must:
1. Be a direct link to an image file (ending in .jpg, .png, .webp, or from a CDN)
2. Be from a reliable source like manufacturer website, Amazon product image, or agricultural supplier
3. Actually exist and be accessible

Return ONLY the image URL, nothing else. If you cannot find a real image, return: https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400"""

            try:
                response = await self.llm.ainvoke(prompt)
                image_url = response.content.strip()
                if not image_url.startswith("http"):
                    image_url = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400"
            except Exception:
                image_url = "https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=400"
        
        return {
            "purchase_link": purchase_info.get("purchase_link", ""),
            "image_url": image_url,
            "price_range": purchase_info.get("price_range", ""),
            "retailer_name": purchase_info.get("retailer_name", "")
        }

    async def close(self):
        await self.http_client.aclose()
