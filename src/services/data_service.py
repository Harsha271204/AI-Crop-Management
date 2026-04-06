import json
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List

class DataService:
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent / "data"
        self.predictions_path = self.data_dir / "predictions.json"
        self.settings_path = self.data_dir / "user_settings.json"
        self._ensure_files_exist()
    
    def _ensure_files_exist(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.predictions_path.exists():
            self._save_json(self.predictions_path, {"predictions": []})
        if not self.settings_path.exists():
            self._save_json(self.settings_path, {"users": {}})
    
    def _load_json(self, path: Path) -> Dict[str, Any]:
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {}
    
    def _save_json(self, path: Path, data: Dict[str, Any]):
        with open(path, 'w') as f:
            json.dump(data, f, indent=2, default=str)
    
    def save_prediction(self, user_email: str, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        data = self._load_json(self.predictions_path)
        predictions = data.get("predictions", [])
        
        new_prediction = {
            "id": str(len(predictions) + 1),
            "user_email": user_email,
            "timestamp": datetime.now().isoformat(),
            "input": prediction_data.get("input", {}),
            "location": prediction_data.get("location", {}),
            "weather": prediction_data.get("weather", {}),
            "soil": prediction_data.get("soil", {}),
            "yield_prediction": prediction_data.get("yield_prediction", {}),
            "optimizations": prediction_data.get("optimizations", [])
        }
        
        predictions.append(new_prediction)
        data["predictions"] = predictions
        self._save_json(self.predictions_path, data)
        
        return {"success": True, "id": new_prediction["id"]}
    
    def get_user_predictions(self, user_email: str) -> List[Dict[str, Any]]:
        data = self._load_json(self.predictions_path)
        predictions = data.get("predictions", [])
        user_predictions = [p for p in predictions if p.get("user_email") == user_email]
        return sorted(user_predictions, key=lambda x: x.get("timestamp", ""), reverse=True)
    
    def get_prediction_by_id(self, prediction_id: str) -> Optional[Dict[str, Any]]:
        data = self._load_json(self.predictions_path)
        predictions = data.get("predictions", [])
        for p in predictions:
            if p.get("id") == prediction_id:
                return p
        return None
    
    def delete_prediction(self, prediction_id: str, user_email: str) -> bool:
        data = self._load_json(self.predictions_path)
        predictions = data.get("predictions", [])
        new_predictions = [p for p in predictions if not (p.get("id") == prediction_id and p.get("user_email") == user_email)]
        if len(new_predictions) < len(predictions):
            data["predictions"] = new_predictions
            self._save_json(self.predictions_path, data)
            return True
        return False
    
    def get_user_analytics(self, user_email: str) -> Dict[str, Any]:
        predictions = self.get_user_predictions(user_email)
        
        if not predictions:
            return {
                "total_predictions": 0,
                "unique_crops": 0,
                "total_hectares": 0,
                "avg_yield": 0,
                "crops_breakdown": [],
                "monthly_predictions": [],
                "recent_predictions": []
            }
        
        crops = {}
        total_hectares = 0
        total_yield = 0
        monthly_data = {}
        
        for p in predictions:
            crop_name = p.get("input", {}).get("crop_name", "Unknown")
            field_size = p.get("input", {}).get("field_size_hectares", 0)
            predicted_yield = p.get("yield_prediction", {}).get("predicted_yield_kg_per_hectare", 0)
            timestamp = p.get("timestamp", "")[:7]
            
            crops[crop_name] = crops.get(crop_name, 0) + 1
            total_hectares += field_size
            total_yield += predicted_yield
            monthly_data[timestamp] = monthly_data.get(timestamp, 0) + 1
        
        crops_breakdown = [{"crop": k, "count": v} for k, v in sorted(crops.items(), key=lambda x: x[1], reverse=True)]
        monthly_predictions = [{"month": k, "count": v} for k, v in sorted(monthly_data.items())]
        
        return {
            "total_predictions": len(predictions),
            "unique_crops": len(crops),
            "total_hectares": round(total_hectares, 2),
            "avg_yield": round(total_yield / len(predictions), 2) if predictions else 0,
            "crops_breakdown": crops_breakdown[:5],
            "monthly_predictions": monthly_predictions[-6:],
            "recent_predictions": predictions[:5]
        }
    
    def get_user_settings(self, user_email: str) -> Dict[str, Any]:
        data = self._load_json(self.settings_path)
        users = data.get("users", {})
        return users.get(user_email, {
            "theme": "light",
            "notifications": True,
            "email_reports": False,
            "default_location": None,
            "preferred_units": "metric"
        })
    
    def update_user_settings(self, user_email: str, settings: Dict[str, Any]) -> bool:
        data = self._load_json(self.settings_path)
        if "users" not in data:
            data["users"] = {}
        data["users"][user_email] = {**self.get_user_settings(user_email), **settings}
        self._save_json(self.settings_path, data)
        return True
