from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db.database import DatabaseManager, PostDraftModel, PublishLogModel

router = APIRouter()
db_manager = DatabaseManager()

class DraftUpdateRequest(BaseModel):
    status: Optional[str] = None
    body: Optional[str] = None

@router.get("/")
def get_drafts(status: str = "all"):
    db = db_manager.db
    query = db.query(PostDraftModel, PublishLogModel).join(
        PublishLogModel, PostDraftModel.post_id == PublishLogModel.post_draft_id
    )
    
    if status != "all":
        # scheduled acts as the initial pending state
        db_status = "scheduled" if status == "pending" else status
        query = query.filter(PublishLogModel.status == db_status)
        
    results = query.all()
    drafts = []
    for draft_model, log_model in results:
        drafts.append({
            "id": str(draft_model.post_id),
            "hook": draft_model.hook,
            "body": draft_model.body,
            "cta": draft_model.cta,
            "hashtags": draft_model.hashtags,
            "format_type": draft_model.format_type,
            "estimated_read_time": draft_model.estimated_read_time,
            "created_at": draft_model.created_at,
            "status": "pending" if log_model.status == "scheduled" else log_model.status,
            "scheduled_for": log_model.scheduled_at
        })
    return drafts

@router.patch("/{id}")
def update_draft(id: str, req: DraftUpdateRequest):
    db = db_manager.db
    draft = db.query(PostDraftModel).filter(PostDraftModel.post_id == id).first()
    log = db.query(PublishLogModel).filter(PublishLogModel.post_draft_id == id).first()
    
    if req.body and draft:
        draft.body = req.body
        
    if req.status and log:
        db_status = "scheduled" if req.status == "pending" else req.status
        log.status = db_status
        
    db.commit()
    return {"message": "Draft updated"}

@router.post("/publish-approved")
def publish_approved():
    db = db_manager.db
    logs = db.query(PublishLogModel).filter(PublishLogModel.status == "approved").all()
    published = 0
    
    for log in logs:
        # Mocking publication
        log.status = "published"
        published += 1
        
    db.commit()
    return {"published": published, "failed": 0}
