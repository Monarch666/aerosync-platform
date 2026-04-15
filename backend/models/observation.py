# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from core.database import Base


class Observation(Base):
    """Records a satellite pass observation (predicted or confirmed)."""
    __tablename__ = "observations"

    id = Column(Integer, primary_key=True, index=True)
    norad_id = Column(Integer, nullable=False, index=True)
    satellite_name = Column(String(120), nullable=False)

    # Pass timing
    aos_time = Column(DateTime, nullable=False)         # Acquisition of Signal
    los_time = Column(DateTime, nullable=False)         # Loss of Signal
    tca_time = Column(DateTime, nullable=True)          # Time of Closest Approach
    max_elevation = Column(Float, nullable=True)        # degrees
    duration_seconds = Column(Integer, nullable=True)

    # Observer state at time of prediction
    observer_lat = Column(Float, nullable=False)
    observer_lon = Column(Float, nullable=False)
    observer_alt = Column(Float, nullable=False)

    # Status
    is_confirmed = Column(Boolean, default=False)       # User manually confirmed observation
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Observation {self.satellite_name} AOS={self.aos_time}>"
