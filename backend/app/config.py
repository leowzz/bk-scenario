from __future__ import annotations

from pathlib import Path

from pydantic import AliasChoices, AliasPath, Field
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    YamlConfigSettingsSource,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
CONFIG_DIR = ROOT_DIR / "config"
APP_CONFIG_PATH = CONFIG_DIR / "app.yaml"


class AppConfig(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DB_SCENARIO_", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/db_scenario",
        validation_alias=AliasChoices("database_url", AliasPath("database", "url")),
    )
    log_level: str = Field(
        default="INFO",
        validation_alias=AliasChoices("log_level", AliasPath("logging", "level")),
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            env_settings,
            YamlConfigSettingsSource(settings_cls, yaml_file=APP_CONFIG_PATH, yaml_file_encoding="utf-8"),
        )


def get_database_url() -> str:
    return AppConfig().database_url


def get_log_level() -> str:
    return AppConfig().log_level.strip().upper()
