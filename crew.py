import os
import json
from datetime import datetime, timezone, timedelta
from crewai import Crew, Process, LLM
from dotenv import load_dotenv
load_dotenv()


from agents.niche_finder import create_niche_finder_agent
from agents.content_creator import create_content_creator_agent
from agents.post_scheduler import create_post_scheduler_agent
from agents.performance_analyst import create_performance_analyst_agent

from tasks.task_definitions import (
    create_niche_analysis_task,
    create_content_generation_task,
    create_scheduling_task,
    create_performance_analysis_task
)

from tools.linkedin_tool import LinkedInProfileTool
from tools.web_search_tool import TrendingTopicsTool
from tools.analytics_tool import LinkedInAnalyticsTool

from db.database import DatabaseManager
from models.post_draft import PostDraft
from models.performance_report import PerformanceReport

from config import PERFORMANCE_CONTEXT_FILE

load_dotenv()

class LinkedInBoosterCrew:
    def __init__(self, rerun=False, custom_groq_key=None, custom_linkedin_url=None, custom_name=None, progress_callback=None):
        self.rerun = rerun
        self.db = DatabaseManager()
        self.custom_name = custom_name
        self.custom_linkedin_url = custom_linkedin_url
        self.progress_callback = progress_callback

        groq_key = custom_groq_key or os.getenv("GROQ_API_KEY")

        self.gemini_pro = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=0.3
        )

        self.gemini_flash = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=groq_key,
            temperature=0.7
        )

        self.linkedin_tool = LinkedInProfileTool(
            custom_profile_url=custom_linkedin_url,
            custom_name=custom_name
        )
        self.web_search_tool = TrendingTopicsTool()
        self.analytics_tool = LinkedInAnalyticsTool()

    def _should_rerun_niche(self) -> bool:
        latest = self.db.get_latest_niche_profile()
        if not latest:
            return True
        days_since = (datetime.now(timezone.utc).replace(tzinfo=None) - latest.created_at.replace(tzinfo=None)).days
        return days_since > 30

    def _load_performance_context(self) -> str | None:
        try:
            with open(PERFORMANCE_CONTEXT_FILE, "r") as f:
                data = json.load(f)
                return json.dumps(data, indent=2)
        except (FileNotFoundError, json.JSONDecodeError):
            return None

    def run_content_cycle(self) -> list:
        if self.progress_callback: self.progress_callback("Fetching Profile", 15)
        
        niche_agent = create_niche_finder_agent(self.gemini_pro, [self.linkedin_tool])
        content_agent = create_content_creator_agent(self.gemini_flash, [self.web_search_tool])
        scheduler_agent = create_post_scheduler_agent(self.gemini_flash)

        tasks = []
        niche_profile_model = self.db.get_latest_niche_profile()
        
        if self._should_rerun_niche() or self.rerun:
            if self.progress_callback: self.progress_callback("Analyzing Profile", 30)
            niche_task = create_niche_analysis_task(niche_agent, custom_profile_url=self.custom_linkedin_url, custom_name=self.custom_name)
            tasks.append(niche_task)
        else:
            if self.progress_callback: self.progress_callback("Analyzing Profile", 30)
            niche_task = None
            
        perf_context = self._load_performance_context()
        latest_perf = self.db.get_latest_performance_report()
        timing_recs = latest_perf.timing_recommendations if latest_perf else None

        class DummyNiche:
            primary_niche = "To be determined by NicheFinder"
            content_angles = ["Analyzing profile..."]
            
        class LoadedNiche:
            def __init__(self, p):
                self.primary_niche = p.primary_niche
                self.content_angles = p.content_angles

        niche_obj = DummyNiche() if niche_task else LoadedNiche(niche_profile_model)
        
        if self.progress_callback: self.progress_callback("Finding Niche", 45)
        
        content_task = create_content_generation_task(content_agent, niche_obj, perf_context, custom_profile_url=self.custom_linkedin_url, custom_name=self.custom_name)
        if niche_task:
            content_task.context = [niche_task]
        tasks.append(content_task)
        
        schedule_task = create_scheduling_task(scheduler_agent, [], timing_recs)
        schedule_task.context = [content_task]
        tasks.append(schedule_task)
        
        agents = [content_agent, scheduler_agent]
        if niche_task:
            agents.insert(0, niche_agent)
            
        if self.progress_callback: self.progress_callback("Generating Strategy", 75)
            
        self._step_count = 0
        def step_handler(step):
            self._step_count += 1
            if self._step_count == 3 and self.progress_callback:
                self.progress_callback("Audience Analysis", 60)
            elif self._step_count == 7 and self.progress_callback:
                self.progress_callback("Generating Posts", 88)

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            memory=False,
            verbose=True,
            step_callback=step_handler
        )
        
        crew.kickoff()
        
        if self.progress_callback: self.progress_callback("Finalizing", 97)
        
        if niche_task and niche_task.output.pydantic:
            niche_data = niche_task.output.pydantic.model_dump()
            self.db.save_niche_profile(niche_data)
            
        if self.progress_callback: self.progress_callback("Saving Drafts", 93)

        drafts = []
        post_drafts_output = content_task.output.pydantic
        if post_drafts_output and hasattr(post_drafts_output, 'drafts'):
            for d in post_drafts_output.drafts:
                draft_data = d.model_dump()
                draft_data['performance_context'] = perf_context
                draft_data['post_id'] = str(draft_data['post_id'])
                saved_draft = self.db.save_post_draft(draft_data)
                drafts.append(saved_draft)

        if self.progress_callback: self.progress_callback("Scheduling Posts", 96)

        schedules_list = []
        schedule_decisions = schedule_task.output.pydantic
        if schedule_decisions and hasattr(schedule_decisions, 'schedules'):
            for idx, decision in enumerate(schedule_decisions.schedules):
                if idx < len(drafts):
                    draft_id = drafts[idx].post_id
                    scheduled_at = datetime.now(timezone.utc) + timedelta(days=idx+1)
                    
                    self.db.save_publish_log({
                        "post_draft_id": str(draft_id),
                        "scheduled_at": scheduled_at,
                        "status": "scheduled"
                    })
                    
                    schedules_list.append({
                        "post_draft_id": str(draft_id),
                        "scheduled_at": scheduled_at.isoformat(),
                        "status": "scheduled"
                    })
                    
        # Ensure we return serializable dictionaries for the frontend API
        drafts_list = [
            {
                "id": str(d.post_id),
                "niche": d.niche,
                "hook": d.hook,
                "body": d.body,
                "cta": d.cta,
                "hashtags": d.hashtags,
                "format_type": d.format_type,
                "estimated_read_time": d.estimated_read_time,
                "created_at": d.created_at.isoformat() if hasattr(d.created_at, 'isoformat') else str(d.created_at),
                "status": "pending"
            } for d in drafts
        ] if drafts else []

        return {
            "drafts": drafts_list,
            "schedules": schedules_list
        }

    def run_analysis_cycle(self, post_ids: list[str]) -> list:
        analyst_agent = create_performance_analyst_agent(self.gemini_pro, [self.analytics_tool])
        
        reports = []
        for pid in post_ids:
            data_str = f"Analyzing LinkedIn Post ID: {pid}. Fetch stats using your tool."
            analysis_task = create_performance_analysis_task(analyst_agent, data_str)
            
            crew = Crew(
                agents=[analyst_agent],
                tasks=[analysis_task],
                process=Process.sequential,
                verbose=True
            )
            
            crew.kickoff()
            
            if analysis_task.output.pydantic:
                report_data = analysis_task.output.pydantic.model_dump()
                report_data['linkedin_post_id'] = pid
                report_data['id'] = str(report_data['id'])
                report_data['post_draft_id'] = str(report_data['post_draft_id'])
                
                saved_report = self.db.save_performance_report(report_data)
                reports.append(saved_report)
                
                with open(PERFORMANCE_CONTEXT_FILE, "w") as f:
                    json.dump(report_data, f, default=str, indent=2)
                    
        return reports
