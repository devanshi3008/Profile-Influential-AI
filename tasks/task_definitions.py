import json
from pathlib import Path
from config import DATA_DIR
from crewai import Task
from models.niche_profile import NicheProfile
from models.post_draft import PostDraft
from models.performance_report import PerformanceReport
from typing import List, Optional
from tools.linkedin_tool import LinkedInProfileTool

def _load_personalisation() -> dict:
    path = Path(DATA_DIR) / "personalisation.json"
    try:
        with open(path, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def _get_dynamic_voice_context() -> str:
    try:
        tool = LinkedInProfileTool()
        data = tool.get_profile_data()
        if data.full_name == "Unknown":
            return "Generic professional tone, helpful and insightful."
        
        context = (
            f"Voice: {data.full_name} ({data.headline}). "
            f"Location: {data.location}. "
            f"Experience: {data.years_experience or 'unknown'} total. "
            f"Current Role: {data.current_role} at {data.current_company}. "
            f"Background Bio: {data.about[:500]}. "
            f"Areas of Expertise: {', '.join(data.skills)}. "
            f"Recently discussed: {', '.join(data.recent_posts)}. "
            "Tone: Conversational, expert yet accessible, avoid AI-sounding platitudes. "
            "Instruction: Use the user's real career history to ground all advice in specific examples."
        )
        return context
    except Exception as e:
        return "Insightful industry expert focusing on practical applications."

def create_niche_analysis_task(agent) -> Task:
    voice_context = _get_dynamic_voice_context()
    return Task(
        description=(
            f"Analyze the following profile context: {voice_context}. "
            "Identify 3-5 high-potential sub-niches specifically tailored to this identity. "
            "Define the unique communication tone that should be used based on their background."
        ),
        expected_output="A structured NicheProfile containing the recommended finding, scores, and content angles.",
        agent=agent,
        output_pydantic=NicheProfile
    )

# Since we want a list of 5 drafts, we wrap it in a root model for CrewAI output consistency if using pydantic 2
from pydantic import BaseModel
class PostDraftList(BaseModel):
    drafts: List[PostDraft]

def create_content_generation_task(agent, niche_profile: NicheProfile, performance_context: Optional[str] = None) -> Task:
    voice_context = _get_dynamic_voice_context()
    
    p = _load_personalisation()
    personalisation_context = ""
    if p.get("skills"):
        personalisation_context += f"User's skills: {', '.join(p['skills'])}\n"
    if p.get("interests"):
        personalisation_context += f"Topics they want to post about: {', '.join(p['interests'])}\n"
    if p.get("post_ideas"):
        personalisation_context += f"Specific post ideas to develop: {chr(10).join(p['post_ideas'])}\n"
    if p.get("topics_to_avoid"):
        personalisation_context += f"Topics to NEVER write about: {', '.join(p['topics_to_avoid'])}\n"
    if p.get("tone_descriptors"):
        personalisation_context += f"Writing tone: {', '.join(p['tone_descriptors'])}\n"
    if p.get("phrases_to_avoid"):
        personalisation_context += f"Phrases to NEVER use: {', '.join(p['phrases_to_avoid'])}\n"

    context_str = (
        f"Profile: {voice_context}\n"
        f"Personalisation:\n{personalisation_context}\n"
        f"Niche Target: {niche_profile.primary_niche}\n"
        f"Content Angles: {', '.join(niche_profile.content_angles)}\n"
    )
    
    if performance_context:
        context_str += f"\nPerformance Feedback to Apply:\n{performance_context}\n"
        
    post_ideas_instr = ""
    if p.get("post_ideas"):
        post_ideas_instr = f"\nPrioritise developing the following post ideas before generating other topics: {', '.join(p['post_ideas'])}"

    return Task(
        description=(
            f"Generate 5 high-impact LinkedIn posts based on this dynamic context:\n{context_str}\n\n"
            "CRITICAL: Write exactly in the derived voice. Use personal stories inferred from the bio. "
            "Avoid generic buzzwords. Each post must feel authentic to the user's real career history."
            f"{post_ideas_instr}"
        ),
        expected_output="A list of 5 PostDraft objects wrapped in a drafts field.",
        agent=agent,
        output_pydantic=PostDraftList
    )

# To schedule, we need to map a day and time to each draft
class ScheduleDecision(BaseModel):
    post_id: str
    publish_day: str
    publish_hour: int
    publish_minute: int

class ScheduleDecisionList(BaseModel):
    schedules: List[ScheduleDecision]

def create_scheduling_task(agent, post_drafts: List[PostDraft], timing_recommendations: Optional[List[str]] = None) -> Task:
    rec_str = "\n".join(timing_recommendations) if timing_recommendations else "Standard engagement benchmarks (Tues-Thurs, 7-9 AM or 12-1 PM)."
    drafts_str = "\n".join([f"- ID: {d.post_id} | Format: {d.format_type} | Hook: {d.hook[:50]}" for d in post_drafts])
    
    return Task(
        description=(
            f"You have 5 post drafts:\n{drafts_str}\n\n"
            f"Timing Recommendations:\n{rec_str}\n\n"
            "Determine the best publish day and time for each post's ID. Avoid scheduling two posts within 24 hours "
            "of each other. Assume next week. Provide exactly 5 schedule decisions."
        ),
        expected_output="A list of schedule decisions mapping post_ids to days and times.",
        agent=agent,
        output_pydantic=ScheduleDecisionList
    )

def create_performance_analysis_task(agent, posts_analytics_data: str) -> Task:
    return Task(
        description=(
            f"Analyze the following performance metrics for published posts:\n{posts_analytics_data}\n\n"
            "Calculate engagement rate. Categorise each post (high > 3%, medium 1-3%, low < 1%). "
            "Identify top 3 performance drivers by comparing high vs low posts. "
            "Generate 3 specific content_recommendations and 2 specific timing_recommendations."
        ),
        expected_output="A PerformanceReport object containing all analytics, tiers, and actionable recommendations.",
        agent=agent,
        output_pydantic=PerformanceReport
    )
