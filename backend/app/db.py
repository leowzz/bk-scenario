from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent.parent / "db" / "data.sqlite"
DATABASE_URL = f"sqlite+pysqlite:///{DB_PATH}"


class Base(DeclarativeBase):
    pass


def get_engine():
    return create_engine(DATABASE_URL, echo=False, future=True)


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
