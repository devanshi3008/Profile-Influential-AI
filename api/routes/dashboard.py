from fastapi import APIRouter, Query
from db.database import (
    DatabaseManager, PerformanceReportModel,
    PostDraftModel, PublishLogModel, NicheProfileModel,
)
from datetime import datetime, timezone, timedelta
from tools.linkedin_tool import LinkedInProfileTool

router   = APIRouter()
db_manager = DatabaseManager()

# ── Per-session profile cache ────────────────────────────────────────────────
# Keyed by linkedin_url so different users never share each other's profile.
# Structure: { url: { "data": dict, "cached_at": datetime } }
_profile_cache: dict = {}
PROFILE_CACHE_TTL_SECONDS = 300  # 5 minutes


def _get_profile(linkedin_url: str | None, user_name: str | None) -> dict | None:
    """Fetch profile with per-URL cache. Falls back gracefully."""
    cache_key = (linkedin_url or "default").strip().rstrip("/")
    now = datetime.now(timezone.utc)

    cached = _profile_cache.get(cache_key)
    if cached:
        age = (now - cached["cached_at"]).total_seconds()
        if age < PROFILE_CACHE_TTL_SECONDS:
            return cached["data"]

    try:
        tool = LinkedInProfileTool(
            custom_profile_url=linkedin_url or None,
            custom_name=user_name or None,
        )
        profile = tool.get_profile_data()
        data = {
            "full_name":       profile.full_name,
            "headline":        profile.headline,
            "location":        profile.location,
            "about":           profile.about,
            "current_role":    profile.current_role,
            "current_company": profile.current_company,
            "skills":          profile.skills,
            "recent_posts":    profile.recent_posts,
            "education":       profile.education,
            "connections":     profile.connections,
            "profile_url":     profile.profile_url,
        }
        _profile_cache[cache_key] = {"data": data, "cached_at": now}
        return data
    except Exception:
        return None


@router.get("/summary")
def get_dashboard_summary(
    # FIX: accept the current user's context from the frontend
    # Frontend sends these as query params after the setup form
    linkedin_url: str | None = Query(default=None),
    user_name:    str | None = Query(default=None),
):
    db = db_manager.db

    profile_dict = _get_profile(linkedin_url, user_name)

    # ── Impressions & engagement ─────────────────────────────────────────────
    reports = db.query(PerformanceReportModel).all()
    total_impressions    = sum(r.impressions      for r in reports)
    avg_engagement_rate  = (
        sum(r.engagement_rate for r in reports) / len(reports)
        if reports else 0.0
    )

    now = datetime.now(timezone.utc)
    thirty_days_ago_naive = (now - timedelta(days=30)).replace(tzinfo=None)
    sixty_days_ago_naive  = (now - timedelta(days=60)).replace(tzinfo=None)

    current_period = [
        r for r in reports
        if r.analysed_at and r.analysed_at > thirty_days_ago_naive
    ]
    prev_period = [
        r for r in reports
        if r.analysed_at and sixty_days_ago_naive < r.analysed_at <= thirty_days_ago_naive
    ]

    curr_imp = sum(r.impressions for r in current_period)
    prev_imp = sum(r.impressions for r in prev_period)
    impressions_delta_pct = (
        round(((curr_imp - prev_imp) / prev_imp) * 100, 1) if prev_imp > 0 else 0.0
    )

    curr_eng = (
        sum(r.engagement_rate for r in current_period) / len(current_period)
        if current_period else 0.0
    )
    prev_eng = (
        sum(r.engagement_rate for r in prev_period) / len(prev_period)
        if prev_period else 0.0
    )
    engagement_delta_pp = round(curr_eng - prev_eng, 1)

    # ── Posts this month ─────────────────────────────────────────────────────
    logs = db.query(PublishLogModel).filter(PublishLogModel.status == "published").all()
    posts_this_month = sum(
        1 for l in logs if l.published_at and l.published_at.month == now.month
    )

    # ── Niche ────────────────────────────────────────────────────────────────
    niche_record = (
        db.query(NicheProfileModel)
        .order_by(NicheProfileModel.created_at.desc())
        .first()
    )
    niche = {
        "primary_niche":    niche_record.primary_niche    if niche_record else "Not determined yet",
        "confidence_score": niche_record.confidence_score if niche_record else 0.0,
        "content_angles":   niche_record.content_angles   if niche_record else [],
    }

    # ── Weekly impressions ───────────────────────────────────────────────────
    weekly_impressions = []
    for i in range(8):
        week_start = (now - timedelta(weeks=i + 1)).replace(tzinfo=None)
        week_end   = (now - timedelta(weeks=i)).replace(tzinfo=None)
        week_sum   = sum(
            r.impressions for r in reports
            if r.analysed_at and week_start < r.analysed_at <= week_end
        )
        weekly_impressions.append({"week": f"W-{i}", "impressions": week_sum})
    weekly_impressions.reverse()

    # ── Top posts ────────────────────────────────────────────────────────────
    top_reports = (
        db.query(PerformanceReportModel)
        .order_by(PerformanceReportModel.impressions.desc())
        .limit(2)
        .all()
    )
    top_posts = []
    for r in top_reports:
        draft = db.query(PostDraftModel).filter(PostDraftModel.post_id == r.post_draft_id).first()
        if draft:
            top_posts.append({
                "id":             str(draft.post_id),
                "hook":           draft.hook,
                "format_type":    draft.format_type,
                "impressions":    r.impressions,
                "engagement_rate":r.engagement_rate,
                "tier":           r.performance_tier,
            })

    # ── Pending drafts count ─────────────────────────────────────────────────
    pending_count = len(db_manager.get_unpublished_drafts())

    # ── Latest insights ──────────────────────────────────────────────────────
    latest_perf = (
        db.query(PerformanceReportModel)
        .order_by(PerformanceReportModel.analysed_at.desc())
        .first()
    )
    if latest_perf and latest_perf.content_recommendations:
        latest_insights = [
            {
                "type":        "up" if idx % 2 == 0 else "down",
                "finding":     f"Insight {idx + 1}",
                "explanation": rec,
            }
            for idx, rec in enumerate(latest_perf.content_recommendations[:3])
        ]
    else:
        latest_insights = [
            {
                "type": "up",
                "finding": "Hook Length",
                "explanation": "Posts with short hooks (<10 words) got 3x reach.",
            },
            {
                "type": "down",
                "finding": "Links in Posts",
                "explanation": "Posts with external links dropped impressions by 40%.",
            },
        ]

    return {
        "total_impressions":    total_impressions,
        "impressions_delta_pct":impressions_delta_pct,
        "avg_engagement_rate":  avg_engagement_rate,
        "engagement_delta_pp":  engagement_delta_pp,
        "posts_this_month":     posts_this_month,
        "niche":                niche,
        "weekly_impressions":   weekly_impressions,
        "top_posts":            top_posts,
        "pending_drafts_count": pending_count,
        "latest_insights":      latest_insights,
        "profile":              profile_dict,
    }
