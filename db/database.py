import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, ForeignKey, select, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Mapped, mapped_column
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./linkedin_booster.db")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class NicheProfileModel(Base):
    __tablename__ = "niche_profiles"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    primary_niche: Mapped[str] = mapped_column(String)
    secondary_niches: Mapped[list] = mapped_column(JSON)
    confidence_score: Mapped[float] = mapped_column(Float)
    rationale: Mapped[str] = mapped_column(String)
    content_angles: Mapped[list] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))


class PostDraftModel(Base):
    __tablename__ = "post_drafts"

    post_id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    niche: Mapped[str] = mapped_column(String)
    hook: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String)
    cta: Mapped[str] = mapped_column(String)
    hashtags: Mapped[list] = mapped_column(JSON)
    format_type: Mapped[str] = mapped_column(String)
    estimated_read_time: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    performance_context: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class PublishLogModel(Base):
    __tablename__ = "publish_logs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_draft_id: Mapped[str] = mapped_column(String, ForeignKey("post_drafts.post_id"))
    linkedin_post_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String) # scheduled, published, failed
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[Optional[str]] = mapped_column(String, nullable=True)


class PerformanceReportModel(Base):
    __tablename__ = "performance_reports"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    post_draft_id: Mapped[str] = mapped_column(String, ForeignKey("post_drafts.post_id"))
    linkedin_post_id: Mapped[str] = mapped_column(String)
    impressions: Mapped[int] = mapped_column(Integer)
    unique_impressions: Mapped[int] = mapped_column(Integer)
    clicks: Mapped[int] = mapped_column(Integer)
    reactions: Mapped[int] = mapped_column(Integer)
    comments: Mapped[int] = mapped_column(Integer)
    shares: Mapped[int] = mapped_column(Integer)
    engagement_rate: Mapped[float] = mapped_column(Float)
    performance_tier: Mapped[str] = mapped_column(String) # high, medium, low
    top_drivers: Mapped[list] = mapped_column(JSON)
    content_recommendations: Mapped[list] = mapped_column(JSON)
    timing_recommendations: Mapped[list] = mapped_column(JSON)
    analysed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)

class DatabaseManager:
    def __init__(self):
        self.db = SessionLocal()

    def save_niche_profile(self, profile_data: dict) -> NicheProfileModel:
        db_profile = NicheProfileModel(**profile_data)
        self.db.add(db_profile)
        self.db.commit()
        self.db.refresh(db_profile)
        return db_profile

    def get_latest_niche_profile(self) -> Optional[NicheProfileModel]:
        return self.db.query(NicheProfileModel).order_by(NicheProfileModel.created_at.desc()).first()

    def save_post_draft(self, draft_data: dict) -> PostDraftModel:
        db_draft = PostDraftModel(**draft_data)
        self.db.add(db_draft)
        self.db.commit()
        self.db.refresh(db_draft)
        return db_draft

    def get_unpublished_drafts(self) -> List[PostDraftModel]:
        subquery = self.db.query(PublishLogModel.post_draft_id).filter(PublishLogModel.status != 'failed').subquery()
        return self.db.query(PostDraftModel).filter(~PostDraftModel.post_id.in_(subquery)).all()

    def save_publish_log(self, log_data: dict) -> PublishLogModel:
        db_log = PublishLogModel(**log_data)
        self.db.add(db_log)
        self.db.commit()
        self.db.refresh(db_log)
        return db_log
        
    def update_publish_log(self, log_id: str, update_data: dict) -> Optional[PublishLogModel]:
        db_log = self.db.query(PublishLogModel).filter(PublishLogModel.id == log_id).first()
        if db_log:
            for key, value in update_data.items():
                setattr(db_log, key, value)
            self.db.commit()
            self.db.refresh(db_log)
        return db_log

    def get_posts_due_for_analysis(self) -> List[PublishLogModel]:
        forty_eight_hours_ago = datetime.now(timezone.utc).timestamp() - 48*3600
        cutoff_date = datetime.fromtimestamp(forty_eight_hours_ago, tz=timezone.utc)
        
        subquery = self.db.query(PerformanceReportModel.post_draft_id).subquery()
        return self.db.query(PublishLogModel).filter(
            PublishLogModel.status == 'published',
            PublishLogModel.published_at <= cutoff_date,
            ~PublishLogModel.post_draft_id.in_(subquery)
        ).all()

    def save_performance_report(self, report_data: dict) -> PerformanceReportModel:
        db_report = PerformanceReportModel(**report_data)
        self.db.add(db_report)
        self.db.commit()
        self.db.refresh(db_report)
        return db_report

    def get_latest_performance_report(self) -> Optional[PerformanceReportModel]:
        return self.db.query(PerformanceReportModel).order_by(PerformanceReportModel.analysed_at.desc()).first()
