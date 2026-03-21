import os
import sys
import argparse
import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from dotenv import load_dotenv

from crew import LinkedInBoosterCrew
from db.database import DatabaseManager

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def run_content_cycle_job():
    logger.info("Starting weekly content cycle...")
    try:
        crew = LinkedInBoosterCrew()
        drafts = crew.run_content_cycle()
        logger.info(f"Successfully generated and scheduled {len(drafts)} post drafts.")
    except Exception as e:
        logger.error(f"Error in content cycle: {e}")

def run_analysis_cycle_job():
    logger.info("Starting daily analysis cycle...")
    try:
        db = DatabaseManager()
        posts_due = db.get_posts_due_for_analysis()
        if not posts_due:
            logger.info("No posts due for analysis (>48h old without report).")
            return
            
        post_ids = [str(p.linkedin_post_id) for p in posts_due if p.linkedin_post_id]
        if not post_ids:
            logger.info("Posts due for analysis missing LinkedIn IDs (publish failed or pending).")
            return
            
        crew = LinkedInBoosterCrew()
        reports = crew.run_analysis_cycle(post_ids)
        logger.info(f"Successfully analyzed {len(reports)} posts.")
    except Exception as e:
        logger.error(f"Error in analysis cycle: {e}")

def main():
    parser = argparse.ArgumentParser(description="LinkedIn Booster Scheduler")
    parser.add_argument("--once", choices=["content", "analyse"], help="Run a specific job once and exit")
    args = parser.parse_args()

    if args.once == "content":
        logger.info("Running content cycle once...")
        run_content_cycle_job()
        sys.exit(0)
    elif args.once == "analyse":
        logger.info("Running analysis cycle once...")
        run_analysis_cycle_job()
        sys.exit(0)

    timezone = os.getenv("POSTING_TIMEZONE", "Asia/Kolkata")
    scheduler = BlockingScheduler(timezone=timezone)
    
    # Run content cycle every Monday at 9 AM
    scheduler.add_job(
        run_content_cycle_job,
        CronTrigger(day_of_week='mon', hour=9, minute=0, timezone=timezone),
        id='content_cycle'
    )
    
    # Run analysis cycle every day at 10 AM, catching ANY post that has crossed the 48h mark
    scheduler.add_job(
        run_analysis_cycle_job,
        CronTrigger(hour=10, minute=0, timezone=timezone),
        id='analysis_cycle'
    )
    
    logger.info(f"Scheduler started. Timzone: {timezone}")
    logger.info("Content cycle: Every Monday @ 09:00")
    logger.info("Analysis cycle: Every day @ 10:00")
    
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped.")

if __name__ == "__main__":
    main()
