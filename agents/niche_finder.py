from crewai import Agent
from langchain_google_genai import ChatGoogleGenerativeAI

def create_niche_finder_agent(llm: ChatGoogleGenerativeAI, tools: list) -> Agent:
    return Agent(
        role="LinkedIn Niche Analyst",
        goal="Analyse the user's LinkedIn profile data and identify their most relevant, high-potential content niche within the technology space.",
        backstory=(
            "You are a personal branding strategist with 10 years of experience helping tech professionals build "
            "influential LinkedIn presences. You excel at pattern recognition — identifying what someone is genuinely "
            "expert in versus what they merely dabble in."
        ),
        verbose=True,
        allow_delegation=False,
        tools=tools,
        llm=llm
    )
