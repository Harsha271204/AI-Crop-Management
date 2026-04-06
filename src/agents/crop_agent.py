from langgraph.graph import StateGraph, END
from src.models.schemas import AgentState, LocationData, CropInput, PredictionResponse
from src.agents.nodes import (
    fetch_location_node,
    fetch_weather_node,
    analyze_soil_node,
    predict_yield_node,
    generate_optimizations_node,
    should_continue,
)


class CropPredictionAgent:
    def __init__(self):
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(AgentState)

        workflow.add_node("fetch_location", fetch_location_node)
        workflow.add_node("fetch_weather", fetch_weather_node)
        workflow.add_node("analyze_soil", analyze_soil_node)
        workflow.add_node("predict_yield", predict_yield_node)
        workflow.add_node("generate_optimizations", generate_optimizations_node)

        workflow.set_entry_point("fetch_location")

        workflow.add_conditional_edges(
            "fetch_location",
            should_continue,
            {
                "fetch_weather": "fetch_weather",
                "error": END,
            },
        )

        workflow.add_conditional_edges(
            "fetch_weather",
            should_continue,
            {
                "analyze_soil": "analyze_soil",
                "error": END,
            },
        )

        workflow.add_conditional_edges(
            "analyze_soil",
            should_continue,
            {
                "predict_yield": "predict_yield",
                "error": END,
            },
        )

        workflow.add_conditional_edges(
            "predict_yield",
            should_continue,
            {
                "generate_optimizations": "generate_optimizations",
                "error": END,
            },
        )

        workflow.add_conditional_edges(
            "generate_optimizations",
            should_continue,
            {
                "complete": END,
                "error": END,
            },
        )

        return workflow.compile()

    async def run(
        self,
        latitude: float,
        longitude: float,
        crop_name: str,
        field_size_hectares: float,
        planting_date: str = None,
        irrigation_type: str = None,
        previous_crop: str = None,
        farming_experience: str = None,
        budget_level: str = None,
    ) -> PredictionResponse:
        initial_state: AgentState = {
            "location": LocationData(latitude=latitude, longitude=longitude),
            "weather": None,
            "soil": None,
            "crop_input": CropInput(
                crop_name=crop_name,
                field_size_hectares=field_size_hectares,
                planting_date=planting_date,
                irrigation_type=irrigation_type,
                previous_crop=previous_crop,
                farming_experience=farming_experience,
                budget_level=budget_level,
            ),
            "yield_prediction": None,
            "optimizations": [],
            "messages": [],
            "current_step": "initialized",
            "error": None,
        }

        result = await self.graph.ainvoke(initial_state)
        
        return PredictionResponse(
            success=result.get("error") is None,
            location=result.get("location"),
            weather=result.get("weather"),
            soil=result.get("soil"),
            yield_prediction=result.get("yield_prediction"),
            optimizations=result.get("optimizations", []),
            messages=result.get("messages", []),
            error=result.get("error"),
        )
