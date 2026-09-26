from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.schemas.common import HealthCheckResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    summary="System and Database Health Check",
    description="Validates that the FastAPI application and the configured database connection are fully operational.",
)
def health_check(db: Session = Depends(get_db)):
    try:
        # Perform active connection ping
        db.execute(text("SELECT 1"))
        db_type = "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite"
        
        return HealthCheckResponse(
            status="healthy",
            version=settings.VERSION,
            database=db_type,
            timestamp=datetime.now(timezone.utc),
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database connection health check failed: {str(e)}",
        )
