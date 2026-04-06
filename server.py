from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router
import os

app = FastAPI(
    title="Crop Yield Prediction API",
    description="AI-powered crop yield prediction and optimization system",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

base_dir = os.path.dirname(os.path.abspath(__file__))
static_path = os.path.join(base_dir, "src", "frontend", "static")
frontend_path = os.path.join(base_dir, "src", "frontend", "index.html")

if os.path.exists(static_path):
    app.mount("/static", StaticFiles(directory=static_path), name="static")


@app.get("/")
async def serve_frontend():
    return FileResponse(frontend_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=False)
