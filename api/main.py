from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes import dashboard, drafts, posts, analytics, personalise
from crew import LinkedInBoosterCrew
import os
import uuid
from pydantic import BaseModel, HttpUrl, Field
import time
 
RUN_RESULTS = {}
 
app = FastAPI(title="LinkedIn Booster API", version="1.0.0")
 
app.add_middleware(CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://li-booster-ui.onrender.com",  # Render frontend (update if your app name differs)
    ],
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
 
class CustomRunRequest(BaseModel):
    name: str = Field(..., min_length=1, description="User's full name")
    linkedin_url: HttpUrl = Field(..., description="Valid LinkedIn profile URL")
    groq_api_key: str = Field(..., min_length=1, description="Groq API Key")
 
def cleanup_old_tasks():
    current_time = time.time()
    expired_keys = [
        tid for tid, data in RUN_RESULTS.items()
        if (data["status"] == "completed" and current_time - data.get("created_at", current_time) > 1800)
        or (data["status"] == "failed"    and current_time - data.get("created_at", current_time) > 600)
    ]
    for tid in expired_keys:
        del RUN_RESULTS[tid]
 
@app.post("/api/crew/run-custom")
def run_crew_custom(req: CustomRunRequest, background_tasks: BackgroundTasks):
    cleanup_old_tasks()
    task_id = str(uuid.uuid4())
 
    # FIX: schedules key was missing from initial dict — polling would
    # get undefined for result.schedules and crash the Dashboard
    RUN_RESULTS[task_id] = {
        "status": "processing",
        "current_step": "Agent Started",
        "progress": 5,
        "drafts": [],
        "schedules": [],        # ← was missing
        "error": None,
        "created_at": time.time(),
    }
 
    def background_run():
        try:
            def progress_cb(step_name: str, progress_pct: int):
                if task_id in RUN_RESULTS:
                    RUN_RESULTS[task_id]["current_step"] = step_name
                    RUN_RESULTS[task_id]["progress"] = progress_pct
 
            crew = LinkedInBoosterCrew(
                custom_groq_key=req.groq_api_key,
                custom_linkedin_url=str(req.linkedin_url),
                custom_name=req.name,
                progress_callback=progress_cb,
            )
            result_data = crew.run_content_cycle()
 
            drafts_out   = result_data.get("drafts",    []) if isinstance(result_data, dict) else []
            schedules_out = result_data.get("schedules", []) if isinstance(result_data, dict) else []
 
            if task_id in RUN_RESULTS:
                # Write drafts first so the frontend sees them as soon as possible
                RUN_RESULTS[task_id]["drafts"]       = drafts_out
                RUN_RESULTS[task_id]["schedules"]    = schedules_out
                RUN_RESULTS[task_id]["current_step"] = "Completed"
                RUN_RESULTS[task_id]["progress"]     = 100
                # Set completed last — frontend polls status, so this is the
                # signal that triggers setGeneratedDrafts; drafts must exist first
                RUN_RESULTS[task_id]["status"]       = "completed"
 
        except Exception as e:
            if task_id in RUN_RESULTS:
                RUN_RESULTS[task_id]["status"]       = "failed"
                RUN_RESULTS[task_id]["progress"]     = 100
                RUN_RESULTS[task_id]["current_step"] = "Failed"
                RUN_RESULTS[task_id]["error"]        = str(e)
 
    background_tasks.add_task(background_run)
    return {"status": "started", "task_id": task_id,
            "message": "Custom content cycle running in background"}
 
@app.get("/api/crew/result/{task_id}")
def get_run_result(task_id: str):
    if task_id not in RUN_RESULTS:
        return {"status": "not_found", "error": "Task not found or expired"}
    return RUN_RESULTS[task_id]
 
if os.path.exists("ui/dist"):
    app.mount("/", StaticFiles(directory="ui/dist", html=True), name="ui")
