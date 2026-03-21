from fastapi import APIRouter
from db.database import DatabaseManager, PublishLogModel, PerformanceReportModel, PostDraftModel

router = APIRouter()
db_manager = DatabaseManager()

@router.get("/")
def get_posts(sort: str = "impressions", days: str = "30", search: str = ""):
    db = db_manager.db
    query = db.query(PublishLogModel, PerformanceReportModel, PostDraftModel)\
        .join(PerformanceReportModel, PublishLogModel.linkedin_post_id == PerformanceReportModel.linkedin_post_id)\
        .join(PostDraftModel, PublishLogModel.post_draft_id == PostDraftModel.post_id)\
        .filter(PublishLogModel.status == "published")
        
    if search:
        query = query.filter(PostDraftModel.hook.ilike(f"%{search}%"))
        
    results = query.all()
    
    posts = []
    for log, report, draft in results:
        posts.append({
            "id": log.id,
            "format_type": draft.format_type,
            "hook": draft.hook,
            "published_at": log.published_at or log.scheduled_at,
            "impressions": report.impressions,
            "clicks": report.clicks,
            "reactions": report.reactions,
            "engagement_rate": report.engagement_rate,
            "tier": report.performance_tier,
            "body": draft.body
        })
        
    if sort == "impressions":
        posts.sort(key=lambda x: x["impressions"], reverse=True)
    elif sort == "engagement":
        posts.sort(key=lambda x: x["engagement_rate"], reverse=True)
    else: 
        posts.sort(key=lambda x: x["published_at"], reverse=True)
        
    return posts
