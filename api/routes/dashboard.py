from fastapi import APIRouter
from db.database import DatabaseManager, PerformanceReportModel, PostDraftModel, PublishLogModel, NicheProfileModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from tools.linkedin_tool import LinkedInProfileTool

router = APIRouter()
db_manager = DatabaseManager()

@router.get("/summary")
def get_dashboard_summary():
    db = db_manager.db
    
    # NEW: Fetch LinkedIn Profile Data
    try:
        tool = LinkedInProfileTool()
        profile = tool.get_profile_data()
        profile_dict = {
            "full_name": profile.full_name,
            "headline": profile.headline,
            "location": profile.location,
            "about": profile.about,
            "current_role": profile.current_role,
            "current_company": profile.current_company,
            "skills": profile.skills,
            "recent_posts": profile.recent_posts,
            "education": profile.education,
            "connections": profile.connections,
            "profile_url": profile.profile_url
        }
    except Exception:
        profile_dict = None

    # 1. Impressions & Engagement
    reports = db.query(PerformanceReportModel).all()
    total_impressions = sum(r.impressions for r in reports)
    avg_engagement_rate = sum(r.engagement_rate for r in reports) / len(reports) if reports else 0.0
    
    # NEW: Live calculation of deltas (simplistic last-30-days vs previous-30-days)
    now = datetime.now(timezone.utc)
    from datetime import timedelta
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)
    
    current_period_reports = [r for r in reports if r.analysed_at > thirty_days_ago]
    prev_period_reports = [r for r in reports if sixty_days_ago < r.analysed_at <= thirty_days_ago]
    
    curr_impressions = sum(r.impressions for r in current_period_reports)
    prev_impressions = sum(r.impressions for r in prev_period_reports)
    
    if prev_impressions > 0:
        impressions_delta_pct = round(((curr_impressions - prev_impressions) / prev_impressions) * 100, 1)
    else:
        impressions_delta_pct = 0.0
        
    curr_eng = sum(r.engagement_rate for r in current_period_reports) / len(current_period_reports) if current_period_reports else 0.0
    prev_eng = sum(r.engagement_rate for r in prev_period_reports) / len(prev_period_reports) if prev_period_reports else 0.0
    engagement_delta_pp = round(curr_eng - prev_eng, 1)
    
    # 2. Posts this month
    current_month = now.month
    logs = db.query(PublishLogModel).filter(PublishLogModel.status == 'published').all()
    posts_this_month = len([l for l in logs if l.published_at and l.published_at.month == current_month])
    
    # 3. Niche
    niche_record = db.query(NicheProfileModel).order_by(NicheProfileModel.created_at.desc()).first()
    niche = {
        "primary_niche": niche_record.primary_niche if niche_record else "No Niche Found",
        "confidence_score": niche_record.confidence_score if niche_record else 0.0,
        "content_angles": niche_record.content_angles if niche_record else []
    }
    
    # 4. Weekly Impressions (Real aggregation)
    # Group reports by week (last 8 weeks)
    weekly_impressions = []
    for i in range(8):
        week_start = now - timedelta(weeks=i+1)
        week_end = now - timedelta(weeks=i)
        week_sum = sum(r.impressions for r in reports if week_start < r.analysed_at <= week_end)
        weekly_impressions.append({
            "week": f"W-{i}",
            "impressions": week_sum
        })
    weekly_impressions.reverse() # Show oldest to newest
    
    # 5. Top Posts
    top_reports = db.query(PerformanceReportModel).order_by(PerformanceReportModel.impressions.desc()).limit(2).all()
    top_posts = []
    for r in top_reports:
        draft = db.query(PostDraftModel).filter(PostDraftModel.post_id == r.post_draft_id).first()
        if draft:
            top_posts.append({
                "id": str(draft.post_id),
                "hook": draft.hook,
                "format_type": draft.format_type,
                "impressions": r.impressions,
                "engagement_rate": r.engagement_rate,
                "tier": r.performance_tier
            })
            
    # 6. Pending Drafts
    pending_count = len(db_manager.get_unpublished_drafts())
    
    # 7. Latest insights
    latest_perf = db.query(PerformanceReportModel).order_by(PerformanceReportModel.analysed_at.desc()).first()
    latest_insights = []
    if latest_perf and latest_perf.content_recommendations:
        for idx, rec in enumerate(latest_perf.content_recommendations[:3]):
            latest_insights.append({
                "type": "up" if idx % 2 == 0 else "down",
                "finding": f"Insight {idx+1}",
                "explanation": rec
            })
    else:
        latest_insights = [
            {"type": "up", "finding": "Hook Length", "explanation": "Posts with short hooks (<10 words) got 3x reach."},
            {"type": "down", "finding": "Links in Posts", "explanation": "Posts with external links dropped impressions by 40%."}
        ]

    return {
        "total_impressions": total_impressions,
        "impressions_delta_pct": impressions_delta_pct,
        "avg_engagement_rate": avg_engagement_rate,
        "engagement_delta_pp": engagement_delta_pp,
        "posts_this_month": posts_this_month,
        "niche": niche,
        "weekly_impressions": weekly_impressions,
        "top_posts": top_posts,
        "pending_drafts_count": pending_count,
        "latest_insights": latest_insights,
        "profile": profile_dict
    }
