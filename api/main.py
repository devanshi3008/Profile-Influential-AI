from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import dashboard, drafts, posts, analytics, personalise
from crew import LinkedInBoosterCrew
import os

app = FastAPI(title="LinkedIn Booster API", version="1.0.0")

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://your-app.fly.dev"],
    allow_methods=["*"],
    allow_headers=["*"])

app.include_router(dashboard.router, prefix="/api/dashboard")
app.include_router(drafts.router,   prefix="/api/drafts")
app.include_router(posts.router,    prefix="/api/posts")
app.include_router(analytics.router,prefix="/api/analytics")
app.include_router(personalise.router, prefix="/api/personalise")

@app.post("/api/crew/run")
def run_crew(background_tasks: BackgroundTasks):
    def background_run():
        crew = LinkedInBoosterCrew()
        crew.run_content_cycle()
        
    background_tasks.add_task(background_run)
    return {"status": "started", "message": "Content cycle running in background"}

# Serve built React app in production if dist exists
if os.path.exists("ui/dist"):
    app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")
