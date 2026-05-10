content = open('crew.py', 'r').read()

new_init = """    def __init__(self, rerun=False):
        self.rerun = rerun
        self.db = DatabaseManager()

        self.gemini_pro = LLM(
            model="groq/llama-3.3-70b-versatile",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3
        )

        self.gemini_flash = LLM(
            model="groq/llama-3.1-8b-instant",
            api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.7
        )

        self.linkedin_tool = LinkedInProfileTool()
        self.web_search_tool = TrendingTopicsTool()
        self.analytics_tool = LinkedInAnalyticsTool()"""

import re
fixed = re.sub(
    r'    def __init__.*?self\.analytics_tool = LinkedInAnalyticsTool\(\)',
    new_init,
    content,
    flags=re.DOTALL
)

open('crew.py', 'w').write(fixed)
print('Fixed successfully')