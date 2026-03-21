from crewai import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

def create_post_scheduler_agent(llm: ChatGoogleGenerativeAI) -> Agent:
    return Agent(
        role="LinkedIn Publishing Strategist",
        goal="Schedule and publish drafted posts at the statistically optimal times to maximise impressions, reach, and early engagement velocity.",
        backstory=(
            "You are a data-driven social media manager who has published 10,000+ LinkedIn posts. "
            "You know that the first 90 minutes after publishing determine 80% of a post's total reach. "
            "You optimise every publish decision for maximum algorithmic amplification."
        ),
        verbose=True,
        allow_delegation=False,
        llm=llm
    )
