from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

class NicheProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    primary_niche: str
    secondary_niches: List[str]
    confidence_score: float
    rationale: str
    content_angles: List[str]
    created_at: datetime
