"""
Pydantic Data Models and Validation for Highway Vehicle Tracking & Safety System
"""

from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator

VehicleCategory = Literal['car', 'bike', 'truck', 'bus']
SpeedLimitStatus = Literal['NORMAL', 'SPEEDING', 'UNKNOWN']
DirectionStatus = Literal['SAME_DIRECTION', 'OPPOSITE_DIRECTION', 'CROSS_TRAFFIC', 'UNKNOWN']
CommunicationStatus = Literal['ACTIVE', 'STALE', 'LOST']
DataSource = Literal['SIMULATED', 'GPS']

class VehicleBase(BaseModel):
    id: str = Field(..., min_length=2, max_length=64, description="Temporary vehicle identifier")
    name: Optional[str] = Field(None, description="Human readable label")
    category: VehicleCategory = Field(..., description="Vehicle category: car, bike, truck, bus")
    latitude: float = Field(..., ge=-90.0, le=90.0, description="WGS84 latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="WGS84 longitude")
    speedKmh: Optional[float] = Field(None, ge=0.0, le=400.0, description="Speed in km/h, nullable when unavailable")
    heading: Optional[float] = Field(None, ge=0.0, le=360.0, description="Heading in degrees (0-359), nullable when stationary")
    timestamp: int = Field(..., description="Timestamp in epoch milliseconds")
    dataSource: DataSource = Field(default="SIMULATED", description="Data provenance: SIMULATED or GPS")
    accuracyMeters: Optional[float] = Field(default=None, ge=0.0, description="Position accuracy in meters")
    speedLimitKmh: Optional[float] = Field(default=80.0, ge=20.0, le=200.0, description="Applicable road speed limit")
    notes: Optional[str] = None

    @field_validator('latitude')
    @classmethod
    def validate_latitude(cls, v):
        if not (-90.0 <= v <= 90.0):
            raise ValueError("Latitude must be between -90 and 90 degrees")
        return v

    @field_validator('longitude')
    @classmethod
    def validate_longitude(cls, v):
        if not (-180.0 <= v <= 180.0):
            raise ValueError("Longitude must be between -180 and 180 degrees")
        return v

class VehicleResponse(VehicleBase):
    speedStatus: SpeedLimitStatus = "NORMAL"
    directionStatus: DirectionStatus = "SAME_DIRECTION"
    communicationStatus: CommunicationStatus = "ACTIVE"
    distanceMeters: float = 0.0
    closingSpeedKmh: Optional[float] = None
    timeToCollisionSeconds: Optional[float] = None
    collisionRiskLevel: Optional[str] = "NONE"
    collisionRiskReason: Optional[str] = None

class ScenarioInfo(BaseModel):
    id: str
    title: str
    description: str
    defaultSpeedLimit: int
    vehicleCount: int
