import os
import json
import logging
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv
from crewai.tools import BaseTool
from playwright.sync_api import sync_playwright

@dataclass
class ProfileData:
    full_name: str = "Unknown"
    headline: str = ""
    location: str = ""
    about: str = ""
    current_role: str = ""
    current_company: str = ""
    years_experience: str = ""
    skills: List[str] = field(default_factory=list)
    recent_posts: List[str] = field(default_factory=list)
    education: List[str] = field(default_factory=list)
    connections: str = ""
    profile_url: str = ""

class LinkedInProfileTool(BaseTool):
    name: str = "LinkedIn Profile Analyzer"
    description: str = "Fetches comprehensive LinkedIn profile data for the logged-in user."
    
    def _run(self) -> str:
        data = self.get_profile_data()
        return json.dumps(data.__dict__)

    def get_profile_data(self) -> ProfileData:
        load_dotenv()
        profile_url = os.getenv("LINKEDIN_PROFILE_URL", "https://www.linkedin.com/in/me/")
        
        session_file = os.path.join("session", "session.json")
        if not os.path.exists(session_file):
            logging.error("Session file not found.")
            return ProfileData()
            
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(storage_state=session_file)
                page = context.new_page()
                
                logging.info(f"Navigating to {profile_url}...")
                page.goto(profile_url, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(3000)
                
                # Robust Selector Logic with Safe Fallbacks
                data = ProfileData(profile_url=page.url)
                
                # 1. Full Name
                try:
                    data.full_name = page.locator("h1").first.inner_text().strip()
                except: pass
                
                # 2. Headline
                try:
                    data.headline = page.locator(".text-body-medium").first.inner_text().strip()
                except: pass
                
                # 3. Location
                try:
                    data.location = page.locator(".text-body-small.inline.t-black--light").first.inner_text().strip()
                except: pass
                
                # 4. Connections
                try:
                    conn_text = page.locator("ul.pv-top-card--list li.text-body-small").first.inner_text()
                    if "connections" in conn_text.lower():
                        data.connections = conn_text.strip()
                except: pass

                # 5. About section
                try:
                    about_section = page.locator("section:has-text('About')").first
                    if about_section.count() > 0:
                        data.about = about_section.locator(".display-flex.ph5.pv3").inner_text().strip()
                except: pass
                
                # 6. Experience and Years
                try:
                    exp_items = page.locator("#experience").locator("..").locator("li.pvs-list__paged-list-item").all()
                    if exp_items:
                        first_exp = exp_items[0]
                        data.current_role = first_exp.locator(".t-bold span").first.inner_text().strip()
                        data.current_company = first_exp.locator(".t-normal span").first.inner_text().split("·")[0].strip()
                        
                        # Total years (heuristic: look for "yrs" or "years" in the whole section)
                        exp_text = page.locator("#experience").locator("..").inner_text()
                        import re
                        matches = re.findall(r"(\d+)\s+(?:yrs|years)", exp_text)
                        if matches:
                            total_years = sum(int(m) for m in matches)
                            data.years_experience = f"{total_years}+ years"
                except: pass

                # 7. Education
                try:
                    edu_items = page.locator("#education").locator("..").locator("li.pvs-list__paged-list-item").all()
                    data.education = [item.locator(".t-bold span").first.inner_text().strip() for item in edu_items[:2]]
                except: pass

                # 8. Skills (Separate Page)
                try:
                    page.goto("https://www.linkedin.com/in/me/details/skills/", wait_until="domcontentloaded", timeout=60000)
                    page.wait_for_timeout(3000)
                    skill_items = page.locator(".pvs-list__paged-list-item .t-bold").all()
                    data.skills = [s.inner_text().strip() for s in skill_items[:10]]
                    page.go_back()
                except: pass

                # 9. Recent Posts (Heuristic from main page or activity)
                try:
                    # Look for the 'Activity' section snippet
                    activity_section = page.locator("section:has-text('Activity')").first
                    if activity_section.count() > 0:
                        posts = activity_section.locator(".pvs-list__paged-list-item").all()
                        data.recent_posts = [p.inner_text().split("\n")[0][:100] for p in posts[:3]]
                except: pass

                browser.close()
                return data
        except Exception as e:
            logging.error(f"Scraping failed: {e}")
            return ProfileData(full_name="", headline="", location="", about="", current_role="", current_company="", years_experience="", connections="", profile_url="")
