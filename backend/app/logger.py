from __future__ import annotations

import sys

from loguru import logger

from .config import get_log_level


def configure_logging() -> None:
    logger.remove()
    logger.add(
        sys.stdout,
        level=get_log_level(),
        format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level:<8} | {name}:{function}:{line} | {message}",
        backtrace=False,
        diagnose=False,
    )

