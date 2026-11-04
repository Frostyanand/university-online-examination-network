import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
SPEC_PATH = BASE_DIR / "network" / "network-spec.yaml"
KATHARA_LAB_DIR = BASE_DIR / "network" / "kathara" / "lab"
PCAPS_DIR = BASE_DIR / "artifacts" / "pcaps"
REPORTS_DIR = BASE_DIR / "artifacts" / "reports"
DATABASE_PATH = BASE_DIR / "backend" / "simulation-api" / "simulation.db"

PCAPS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Application settings
API_HOST = os.getenv("API_HOST", "127.0.0.1")
API_PORT = int(os.getenv("API_PORT", "8000"))
KATHARA_LAB_NAME = "university_exam_lab"
DEMO_PROFILE = os.getenv("SIMULATION_PROFILE", "demo").lower() == "demo"

