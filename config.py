import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

DATA_DIR = Path(os.getenv("DATA_DIR", "."))
DB_PATH = os.getenv("DB_URL", f"sqlite:///{DATA_DIR / 'linkedin_booster.db'}")
SESSION_PATH = DATA_DIR / "session"
SESSION_FILE = SESSION_PATH / "session.json"
PERFORMANCE_CONTEXT_FILE = DATA_DIR / "performance_context.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSION_PATH.mkdir(parents=True, exist_ok=True)