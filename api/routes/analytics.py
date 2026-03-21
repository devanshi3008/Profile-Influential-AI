from fastapi import APIRouter
from db.database import DatabaseManager, PerformanceReportModel, PostDraftModel, PublishLogModel

router = APIRouter()
db_manager = DatabaseManager()

@router.get("/summary")
def get_analytics_summary(days: int = 30):
    db = db_manager.db
    
    reports = db.query(PerformanceReportModel, PostDraftModel, PublishLogModel)\
        .join(PostDraftModel, PerformanceReportModel.post_draft_id == PostDraftModel.post_id)\
        .join(PublishLogModel, PerformanceReportModel.linkedin_post_id == PublishLogModel.linkedin_post_id)\
        .all()
        
    impressions_over_time = []
    formats = {}
    heatmap = {}
    
    for report, draft, log in reports:
        impressions_over_time.append({
            "date": log.published_at.strftime("%Y-%m-%d") if log.published_at else report.analysed_at.strftime("%Y-%m-%d"),
            "impressions": report.impressions,
            "tier": report.performance_tier,
            "hook": draft.hook[:30] + "..."
        })
        
        fmt = draft.format_type
        if fmt not in formats:
            formats[fmt] = {"total_imp": 0, "count": 0}
        formats[fmt]["total_imp"] += report.impressions
        formats[fmt]["count"] += 1
        
        dt = log.published_at or log.scheduled_at
        if dt:
            day = dt.strftime("%a")
            hour = dt.hour
            key = f"{day}_{hour}"
            if key not in heatmap:
                heatmap[key] = {"day": day, "hour": hour, "total_imp": 0, "count": 0}
            heatmap[key]["total_imp"] += report.impressions
            heatmap[key]["count"] += 1
            
    format_performance = []
    for fmt, data in formats.items():
        format_performance.append({
            "format_type": fmt,
            "avg_impressions": data["total_imp"] / data["count"],
            "post_count": data["count"]
        })
        
    time_heatmap = []
    for k, data in heatmap.items():
        time_heatmap.append({
            "day": data["day"],
            "hour": data["hour"],
            "avg_impressions": data["total_imp"] / data["count"],
            "count": data["count"]
        })
        
    unique_reports = db.query(PerformanceReportModel).order_by(PerformanceReportModel.analysed_at.desc()).all()
    rec_history = []
    for r in unique_reports:
        if r.content_recommendations or r.timing_recommendations:
            rec_history.append({
                "week": r.analysed_at.strftime("Week of %b %d, %Y"),
                "content_recs": r.content_recommendations,
                "timing_recs": r.timing_recommendations,
                "analysed_at": r.analysed_at
            })
            
    return {
        "impressions_over_time": sorted(impressions_over_time, key=lambda x: x["date"]),
        "format_performance": format_performance,
        "time_heatmap": time_heatmap,
        "recommendation_history": rec_history
    }
