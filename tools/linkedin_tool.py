import os
import json
import logging
import re
import requests
from dataclasses import dataclass, field
from typing import List, Optional
from dotenv import load_dotenv
from crewai.tools import BaseTool

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class ProfileData:
    full_name: str = ""
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


# ---------------------------------------------------------------------------
# Strategy 1 — Proxycurl (paid but has a free trial with 10 credits)
# Set PROXYCURL_API_KEY in your .env / Render env vars to enable this.
# Sign up free at https://nubela.co/proxycurl
# ---------------------------------------------------------------------------
def _fetch_via_proxycurl(profile_url: str) -> Optional[ProfileData]:
    api_key = os.getenv("PROXYCURL_API_KEY")
    if not api_key:
        return None

    try:
        resp = requests.get(
            "https://nubela.co/proxycurl/api/v2/linkedin",
            params={"url": profile_url, "skills": "include", "extra": "include"},
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=20,
        )
        if resp.status_code != 200:
            logger.warning(f"Proxycurl returned {resp.status_code}")
            return None

        d = resp.json()

        experiences = d.get("experiences") or []
        current_exp = next((e for e in experiences if not e.get("ends_at")), experiences[0] if experiences else {})

        educations = d.get("education") or []
        edu_names = [e.get("school", "") for e in educations[:2] if e.get("school")]

        skills_raw = d.get("skills") or []
        skill_names = [s.get("name", "") for s in skills_raw[:10] if s.get("name")]

        # Approximate total experience years from all roles
        total_months = 0
        for exp in experiences:
            start = exp.get("starts_at") or {}
            end   = exp.get("ends_at")   or {}
            sy, sm = start.get("year", 0), start.get("month", 1)
            if sy:
                import datetime
                now = datetime.date.today()
                ey = end.get("year",  now.year)  if end else now.year
                em = end.get("month", now.month) if end else now.month
                total_months += max(0, (ey - sy) * 12 + (em - sm))
        years_exp = f"{total_months // 12}+ years" if total_months else ""

        return ProfileData(
            full_name       = f"{d.get('first_name', '')} {d.get('last_name', '')}".strip(),
            headline        = d.get("headline", ""),
            location        = d.get("city", "") or d.get("country_full_name", ""),
            about           = d.get("summary", ""),
            current_role    = current_exp.get("title", ""),
            current_company = current_exp.get("company", ""),
            years_experience= years_exp,
            skills          = skill_names,
            recent_posts    = [],           # Proxycurl free tier doesn't include posts
            education       = edu_names,
            connections     = str(d.get("connections", "") or ""),
            profile_url     = profile_url,
        )
    except Exception as e:
        logger.error(f"Proxycurl fetch failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 2 — RapidAPI "Fresh LinkedIn Profile Data" (free 100 req/month)
# Set RAPIDAPI_KEY in your .env / Render env vars to enable this.
# Subscribe free at https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data
# ---------------------------------------------------------------------------
def _fetch_via_rapidapi(profile_url: str) -> Optional[ProfileData]:
    api_key = os.getenv("RAPIDAPI_KEY")
    if not api_key:
        return None

    try:
        resp = requests.get(
            "https://fresh-linkedin-profile-data.p.rapidapi.com/get-linkedin-profile",
            params={"linkedin_url": profile_url, "include_skills": "true"},
            headers={
                "X-RapidAPI-Key": api_key,
                "X-RapidAPI-Host": "fresh-linkedin-profile-data.p.rapidapi.com",
            },
            timeout=20,
        )
        if resp.status_code != 200:
            logger.warning(f"RapidAPI returned {resp.status_code}")
            return None

        d = resp.json().get("data", {})
        if not d:
            return None

        experiences = d.get("experiences") or []
        current_exp = next((e for e in experiences if e.get("is_current")), experiences[0] if experiences else {})

        educations  = d.get("educations") or []
        edu_names   = [e.get("school", "") for e in educations[:2] if e.get("school")]

        skills_raw  = d.get("skills") or []
        skill_names = [s.get("name", s) if isinstance(s, dict) else str(s) for s in skills_raw[:10]]

        return ProfileData(
            full_name       = d.get("full_name", ""),
            headline        = d.get("headline", ""),
            location        = d.get("location", ""),
            about           = d.get("about", ""),
            current_role    = current_exp.get("title", ""),
            current_company = current_exp.get("company", ""),
            years_experience= "",
            skills          = skill_names,
            recent_posts    = [],
            education       = edu_names,
            connections     = str(d.get("connections_count", "") or ""),
            profile_url     = profile_url,
        )
    except Exception as e:
        logger.error(f"RapidAPI fetch failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Strategy 3 — Manual fallback using data the user already gave us at /setup
# Reads from LINKEDIN_USER_NAME and LINKEDIN_USER_HEADLINE env vars which
# the setup endpoint writes automatically (see main.py patch below).
# Zero external calls, always works, no scraping needed.
# ---------------------------------------------------------------------------
def _build_from_env_fallback(profile_url: str, custom_name: Optional[str] = None) -> ProfileData:
    name = (
        custom_name
        or os.getenv("LINKEDIN_USER_NAME", "")
        or _extract_name_from_url(profile_url)
    )
    return ProfileData(
        full_name   = name,
        headline    = os.getenv("LINKEDIN_USER_HEADLINE", ""),
        location    = os.getenv("LINKEDIN_USER_LOCATION", ""),
        about       = os.getenv("LINKEDIN_USER_ABOUT", ""),
        current_role= os.getenv("LINKEDIN_USER_ROLE", ""),
        connections = os.getenv("LINKEDIN_USER_CONNECTIONS", ""),
        skills      = _parse_list_env("LINKEDIN_USER_SKILLS"),
        profile_url = profile_url,
    )


def _extract_name_from_url(url: str) -> str:
    """linkedin.com/in/john-doe-123 → 'John Doe'"""
    try:
        slug = url.rstrip("/").split("/in/")[-1].split("/")[0]
        parts = re.split(r"[-_]", slug)
        name_parts = [p.capitalize() for p in parts if not p.isdigit() and len(p) > 1]
        return " ".join(name_parts[:3])
    except Exception:
        return ""


def _parse_list_env(key: str) -> List[str]:
    raw = os.getenv(key, "")
    if not raw:
        return []
    return [s.strip() for s in raw.split(",") if s.strip()]


# ---------------------------------------------------------------------------
# CrewAI Tool wrapper
# ---------------------------------------------------------------------------
class LinkedInProfileTool(BaseTool):
    name: str = "LinkedIn Profile Analyzer"
    description: str = (
        "Fetches LinkedIn profile data for the target user. "
        "Returns name, headline, location, about, role, company, skills, education."
    )
    custom_profile_url: Optional[str] = None
    custom_name: Optional[str] = None

    def _run(self) -> str:
        data = self.get_profile_data()
        return json.dumps(data.__dict__)

    def get_profile_data(self) -> ProfileData:
        load_dotenv()
        profile_url = (
            self.custom_profile_url
            or os.getenv("LINKEDIN_PROFILE_URL", "")
        )

        if not profile_url:
            logger.warning("No LinkedIn URL provided — using env fallback.")
            return _build_from_env_fallback("", self.custom_name)

        # Try API strategies in order of reliability
        for strategy in (_fetch_via_proxycurl, _fetch_via_rapidapi):
            result = strategy(profile_url)
            if result and result.full_name:
                logger.info(f"Profile fetched via {strategy.__name__}: {result.full_name}")
                # If we got a name from API but custom_name was provided, prefer custom
                if self.custom_name and not result.full_name:
                    result.full_name = self.custom_name
                return result

        # All API strategies failed — use what the user already told us
        logger.info("All API strategies failed — using env/form fallback.")
        return _build_from_env_fallback(profile_url, self.custom_name)
