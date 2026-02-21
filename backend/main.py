from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from generator import generate_component
from corrector import generate_with_correction
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class GenerateRequest(BaseModel):
    prompt: str
    conversation_history: list = []  # For multi-turn

@app.post("/generate")
async def generate(req: GenerateRequest):
    result = generate_with_correction(req.prompt, generate_component, req.conversation_history)
    return {
        "ts_code": result["final_code"]["ts"],
        "html_code": result["final_code"]["html"],
        "raw": result["final_code"]["raw"],
        "valid": result["validation"]["valid"],
        "errors": result["validation"]["errors"],
        "attempts_made": result["attempts"]
    }

@app.get("/design-system")
async def get_design_system():
    with open(os.path.join(BASE_DIR, "design_system.json")) as f:
        return json.load(f)