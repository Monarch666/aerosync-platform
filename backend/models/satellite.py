# Copyright (c) 2026 Wingspann Global Pvt Ltd
# Licensed under the MIT License — see LICENSE file in root

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from core.database import Base


class Satellite(Base):
    """Represents a satellite entry in the local catalog."""
    __tablename__ = "satellites"

    id = Column(Integer, primary_key=True, index=True)
    norad_id = Column(Integer, unique=True, index=True, nullable=False)
    name = Column(String(120), nullable=False, index=True)
    tle_line1 = Column(String(70), nullable=False)
    tle_line2 = Column(String(70), nullable=False)
    group = Column(String(50), nullable=True)        # e.g. "stations", "amateur", "weather"
    country = Column(String(10), nullable=True)
    launch_date = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    is_favourite = Column(Boolean, default=False)
    tle_epoch = Column(Float, nullable=True)          # TLE epoch as Julian date
    tle_updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    created_at = Column(DateTime, server_default=func.now())

    def __repr__(self):
        return f"<Satellite {self.norad_id} {self.name}>"
