from crewai import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

def create_performance_analyst_agent(llm: ChatGoogleGenerativeAI, tools: list) -> Agent:
    return Agent(
        role="LinkedIn Analytics Strategist",
        goal=(
            "Analyse post performance 48 hours after publishing, identify what drove high or low impressions, "
            "and generate specific, actionable recommendations to improve content strategy and scheduling."
        ),
        backstory=(
            "You are a LinkedIn growth analyst who has audited 1,000+ content accounts. You see patterns invisible "
            "to the naked eye — why a Tuesday 8 AM post outperformed a Thursday 12 PM post, why storytelling posts "
            "get 3x the reach of tip lists in AI niches. Your recommendations are always specific, never generic."
        ),
        verbose=True,
        allow_delegation=False,
        tools=tools,
        llm=llm
    )
