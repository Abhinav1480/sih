import sys
import os
import uvicorn

# Add backend directory to sys.path so 'app' imports resolve seamlessly
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

if __name__ == "__main__":
    from app.config import settings
    print(f"============================================================")
    print(f"  STARTING ORCA BACKEND (SIH 2026 PS 26176)")
    print(f"  Mode: {settings.ORCA_MODE}")
    print(f"  URL: http://{settings.HOST}:{settings.PORT}")
    print(f"  Docs: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"============================================================")
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
