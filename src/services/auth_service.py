import json
import hashlib
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any

class AuthService:
    def __init__(self):
        self.db_path = Path(__file__).parent.parent.parent / "data" / "users.json"
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.db_path.exists():
            default_users = {
                "users": [
                    {
                        "id": "1",
                        "name": "Bhavish Reddy",
                        "email": "bhavishreddy001@gmail.com",
                        "password_hash": self._hash_password("123456789"),
                        "created_at": datetime.now().isoformat(),
                        "role": "admin"
                    }
                ]
            }
            self._save_db(default_users)
    
    def _hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    def _load_db(self) -> Dict[str, Any]:
        try:
            with open(self.db_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"users": []}
    
    def _save_db(self, data: Dict[str, Any]):
        with open(self.db_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def authenticate(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        db = self._load_db()
        password_hash = self._hash_password(password)
        for user in db.get("users", []):
            if user["email"] == email and user["password_hash"] == password_hash:
                return {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user.get("role", "user")
                }
        return None
    
    def register(self, name: str, email: str, password: str) -> Dict[str, Any]:
        db = self._load_db()
        for user in db.get("users", []):
            if user["email"] == email:
                return {"success": False, "error": "An account with this email already exists"}
        
        new_id = str(len(db.get("users", [])) + 1)
        new_user = {
            "id": new_id,
            "name": name,
            "email": email,
            "password_hash": self._hash_password(password),
            "created_at": datetime.now().isoformat(),
            "role": "user"
        }
        db["users"].append(new_user)
        self._save_db(db)
        
        return {"success": True, "user": {"id": new_id, "name": name, "email": email}}
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        db = self._load_db()
        for user in db.get("users", []):
            if user["email"] == email:
                return {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user.get("role", "user")
                }
        return None
    
    def get_all_users(self) -> list:
        db = self._load_db()
        return [
            {"id": u["id"], "name": u["name"], "email": u["email"], "role": u.get("role", "user")}
            for u in db.get("users", [])
        ]
    
    def update_user(self, email: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update user information in the database"""
        print(f"[DEBUG] update_user called with email={email}, updates={updates}")
        db = self._load_db()
        user_found = False
        
        for user in db.get("users", []):
            if user["email"] == email:
                user_found = True
                print(f"[DEBUG] User found: {user['email']}")
                
                # Update name if provided
                if "name" in updates:
                    print(f"[DEBUG] Updating name from '{user['name']}' to '{updates['name']}'")
                    user["name"] = updates["name"]
                
                # Update password if provided
                if "password" in updates:
                    new_hash = self._hash_password(updates["password"])
                    print(f"[DEBUG] Updating password_hash from '{user['password_hash']}' to '{new_hash}'")
                    user["password_hash"] = new_hash
                
                # Save updated database
                print(f"[DEBUG] Saving database to {self.db_path}")
                self._save_db(db)
                print(f"[DEBUG] Database saved successfully")
                
                return {
                    "success": True,
                    "user": {
                        "id": user["id"],
                        "name": user["name"],
                        "email": user["email"],
                        "role": user.get("role", "user")
                    }
                }
        
        if not user_found:
            print(f"[DEBUG] User not found with email: {email}")
            return {"success": False, "error": "User not found"}
        
        return {"success": False, "error": "Update failed"}
    
    def register_user(self, name: str, email: str, password: str) -> Dict[str, Any]:
        """Alias for register method to match the routes"""
        return self.register(name, email, password)
