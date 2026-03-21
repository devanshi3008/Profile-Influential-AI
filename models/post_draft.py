from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class PostDraft(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    post_id: UUID
    niche: str
    hook: str
    body: str
    cta: str
    hashtags: List[str]
    format_type: str
    estimated_read_time: int
    created_at: datetime
    performance_context: Optional[str] = None
