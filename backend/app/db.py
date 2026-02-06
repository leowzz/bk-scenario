from __future__ import annotations

from functools import lru_cache

from sqlalchemy.orm import sessionmaker
from sqlmodel import Session, create_engine

from .config import get_database_url


@lru_cache(maxsize=1)
def get_engine():
    return create_engine(get_database_url(), echo=False)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine(), class_=Session)
