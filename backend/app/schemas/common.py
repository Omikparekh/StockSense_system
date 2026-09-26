from datetime import datetime
from pydantic import BaseModel, ConfigDict


class HealthCheckResponse(BaseModel):
    status: str
    version: str
    database: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardMessageResponse(BaseModel):
    message: str
    detail: str = ""
