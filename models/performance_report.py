from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime
from uuid import UUID

class PerformanceReport(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    post_draft_id: UUID
    linkedin_post_id: str
    impressions: int
    unique_impressions: int
    clicks: int
    reactions: int
    comments: int
    shares: int
    engagement_rate: float
    performance_tier: str
    top_drivers: List[str]
    content_recommendations: List[str]
    timing_recommendations: List[str]
    analysed_at: datetime
