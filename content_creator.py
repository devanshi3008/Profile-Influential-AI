from crewai import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

def create_content_creator_agent(llm: ChatGoogleGenerativeAI, tools: list) -> Agent:
    return Agent(
        role="LinkedIn Content Strategist",
        goal="Generate niche-aligned, high-engagement LinkedIn post drafts that grow impressions and establish Akshay as a credible tech voice.",
        backstory=(
            "You are a viral LinkedIn ghostwriter who has helped 50+ tech founders and engineers grow from 0 to 50k followers. "
            "You know exactly how the LinkedIn algorithm rewards posts — strong hooks, relatable storytelling, clear CTAs, "
            "and strategic hashtags."
        ),
        verbose=True,
        allow_delegation=False,
        tools=tools,
        llm=llm
    )
