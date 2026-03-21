import os
from crewai.tools import BaseTool
from tavily import TavilyClient
import logging

class TrendingTopicsTool(BaseTool):
    name: str = "Trending Tech Topics Search"
    description: str = "Searches the web for trending topics in a specific tech niche from the last 7 days."
    
    def _run(self, niche: str) -> str:
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return "Error: TAVILY_API_KEY is not set in environment variables."
            
        try:
            client = TavilyClient(api_key=api_key)
            query = f"trending {niche} topics last 7 days"
            
            response = client.search(
                query=query,
                search_depth="advanced",
                max_results=5
            )
            
            results = []
            for item in response.get("results", []):
                results.append(f"Title: {item['title']}\nSummary: {item['content']}\nURL: {item['url']}\n")
                
            return "\n".join(results) if results else "No trending topics found."
        except Exception as e:
            logging.error(f"Error in web search: {e}")
            return f"Error performing web search: {str(e)}"
