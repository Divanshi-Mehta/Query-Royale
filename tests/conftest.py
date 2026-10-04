import sys
from pathlib import Path
from dotenv import load_dotenv

backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
