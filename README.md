# Profile Influential AI

A 4-agent AI system built with CrewAI and Google Gemini that autonomously manages LinkedIn content to maximise impressions and reach.

## Project Overview

Profile Influential AI runs as an automated pipeline with four specialized agents:

1. **Niche Finder (Agent 1):** Dynamically extracts your `ProfileData` (headline, bio, career history, skills) to define your authentic professional persona.
2. **Content Creator (Agent 2):** Generates 5 high-impact post drafts per week using real-time voice context derived directly from your profile.
3. **Post Scheduler (Agent 3):** Schedules and publishes the drafts at statistically optimal times.
4. **Performance Analyst (Agent 4):** Analyzes metrics and feeds recommendations back into the next cycle for continuous improvement.

## Prerequisites

- Python 3.11+
- Google Gemini API Key
- LinkedIn API v2 Credentials
- Tavily API Key

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd linkedin_booster
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
playwright install chromium
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

### Obtaining API Credentials

**Google Gemini API:**

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create an API key and add it to `GEMINI_API_KEY`.

**Tavily API:**

1. Sign up at [Tavily](https://tavily.com/).
2. Get your API key and add it to `TAVILY_API_KEY`.

**LinkedIn API v2:**

1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App.
3. Request access to the **Share on LinkedIn** and **Sign In with LinkedIn using OpenID Connect** products. For Analytics, you'll need the **Advertising API** or similar access depending on your account type.
4. Generate an OAuth 2.0 Access Token with the following scopes:
   - `openid`
   - `profile`
   - `email`
   - `w_member_social` (to post content)
   - `r_member_social` (for analytics/reading posts)
5. Fill in the `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, and `LINKEDIN_ACCESS_TOKEN`.
6. To get `LINKEDIN_USER_URN`, use the `/v2/me` endpoint with your token. It usually looks like `urn:li:person:YOUR_ID`.

## How to Run

There are two ways to run the system: using the CLI for manual execution or the scheduler for automated execution.

### Manual CLI Execution

You can run manual commands to force a cycle:

```bash
# Run the weekly content generation and scheduling cycle
python main.py run

# Check for posts older than 48 hours and analyze their performance
python main.py analyse

# View the system's current status and scheduled posts
python main.py status
```

### Automated Scheduling

To run the system autonomously as a background process:

```bash
python scheduler.py
```

This will run:

- **Content Cycle:** Every Monday at 9:00 AM (in your configured timezone).
- **Analysis Cycle:** Every day at 10:00 AM, analyzing any mapped posts that reach the 48-hour age threshold.

## Database

The project uses a local SQLite database (`linkedin_booster.db`) managed through SQLAlchemy to store niche records, post drafts, publish logs, and performance data. It is automatically created on the first run.
