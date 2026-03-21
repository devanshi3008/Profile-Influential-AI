import os
import json
import tempfile
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from config import DATA_DIR

router = APIRouter()
PERSONALISATION_PATH = DATA_DIR / "personalisation.json"

class PersonalisationData(BaseModel):
    skills: List[str] = []
    interests: List[str] = []
    post_ideas: List[str] = []
    topics_to_avoid: List[str] = []
    tone_descriptors: List[str] = []
    phrases_to_avoid: List[str] = []

@router.get("/", response_model=PersonalisationData)
def get_personalisation():
    if not PERSONALISATION_PATH.exists():
        return PersonalisationData()
    
    try:
        with open(PERSONALISATION_PATH, "r") as f:
            data = json.load(f)
            return PersonalisationData(**data)
    except (json.JSONDecodeError, Exception):
        return PersonalisationData()

@router.post("/", response_model=PersonalisationData)
def save_personalisation(data: PersonalisationData):
    try:
        # Atomic write: write to temp file then rename
        with tempfile.NamedTemporaryFile("w", delete=False, dir=DATA_DIR) as tf:
            json.dump(data.model_dump(), tf, indent=2)
            temp_name = tf.name
        
        os.replace(temp_name, PERSONALISATION_PATH)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save personalisation: {str(e)}")
