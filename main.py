import asyncio
from src.agents.crop_agent import CropPredictionAgent


async def main():
    agent = CropPredictionAgent()
    
    print("=" * 70)
    print("AI-Powered Crop Yield Prediction & Optimization System")
    print("=" * 70)
    
    try:
        latitude = float(input("\nEnter Latitude: "))
        longitude = float(input("Enter Longitude: "))
        crop_name = input("Enter Crop Name: ")
        field_size = float(input("Enter Field Size (hectares): "))
        planting_date = input("Enter Planting Date (YYYY-MM-DD) or press Enter to skip: ").strip() or None
        irrigation_type = input("Enter Irrigation Type or press Enter to skip: ").strip() or None
        previous_crop = input("Enter Previous Crop or press Enter to skip: ").strip() or None
        farming_experience = input("Enter Farming Experience (Beginner/Intermediate/Experienced/Expert) or press Enter: ").strip() or None
        budget_level = input("Enter Budget Level (Low/Medium/High/Premium) or press Enter: ").strip() or None
    except ValueError as e:
        print(f"Invalid input: {e}")
        return

    print("\n" + "=" * 70)
    print("Processing... This may take a minute.")
    print("=" * 70)

    result = await agent.run(
        latitude=latitude,
        longitude=longitude,
        crop_name=crop_name,
        field_size_hectares=field_size,
        planting_date=planting_date,
        irrigation_type=irrigation_type,
        previous_crop=previous_crop,
        farming_experience=farming_experience,
        budget_level=budget_level,
    )

    if not result.success:
        print(f"\nError: {result.error}")
        return

    print("\n" + "=" * 70)
    print("ANALYSIS RESULTS")
    print("=" * 70)

    if result.location:
        loc = result.location
        print(f"\nLocation: {loc.city or ''}, {loc.region or ''}, {loc.country or ''}")
        print(f"Coordinates: {loc.latitude}, {loc.longitude}")

    if result.weather:
        w = result.weather
        print(f"\nWeather Conditions:")
        print(f"  Temperature: {w.temperature_avg}C (Min: {w.temperature_min}, Max: {w.temperature_max})")
        print(f"  Humidity: {w.humidity}%")
        print(f"  Precipitation: {w.precipitation}mm")
        print(f"  Wind Speed: {w.wind_speed} km/h")

    if result.soil:
        s = result.soil
        print(f"\nSoil Analysis:")
        print(f"  Type: {s.soil_type}")
        print(f"  pH Level: {s.ph_level}")
        print(f"  NPK: {s.nitrogen:.0f}-{s.phosphorus:.0f}-{s.potassium:.0f}")
        print(f"  Organic Matter: {s.organic_matter}%")

    if result.yield_prediction:
        p = result.yield_prediction
        print(f"\nYield Prediction:")
        print(f"  Predicted Yield: {p.predicted_yield_kg_per_hectare:,.0f} kg/ha")
        print(f"  Total Estimated: {p.predicted_yield_kg_per_hectare * field_size:,.0f} kg")
        print(f"  Yield Range: {p.yield_range_min:,.0f} - {p.yield_range_max:,.0f} kg/ha")
        print(f"  Confidence: {p.confidence_level}")
        print(f"  Growing Season: {p.growing_season_days} days")
        if p.optimal_harvest_window:
            print(f"  Optimal Harvest: {p.optimal_harvest_window}")
        if p.risk_factors:
            print(f"  Risk Factors: {', '.join(p.risk_factors)}")

    if result.optimizations:
        print(f"\nOptimization Recommendations:")
        for i, opt in enumerate(result.optimizations, 1):
            print(f"\n  {i}. [{opt.priority}] {opt.category}")
            print(f"     {opt.recommendation[:200]}...")
            print(f"     Expected Improvement: {opt.expected_improvement}")
            
            if opt.products:
                print("     Recommended Products:")
                for prod in opt.products:
                    print(f"       - {prod.name} ({prod.type})")
                    if prod.price_range:
                        print(f"         Price: {prod.price_range}")
                    print(f"         Buy: {prod.purchase_link}")

    print("\n" + "=" * 70)
    print("Processing Log:")
    for msg in result.messages:
        print(f"  > {msg}")


if __name__ == "__main__":
    asyncio.run(main())
