"""Runtime configuration, read from environment variables (never from the browser)."""
import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:  # python-dotenv is optional
    pass


@dataclass(frozen=True)
class Settings:
    allowed_origins: list
    max_upload_mb: int
    max_rows: int
    sentiment_mode: str  # auto | heuristic | transformer
    model_name: str
    llm_enabled: bool
    llm_base_url: str
    llm_model: str
    llm_api_key: str
    category_config_path: str

    @property
    def llm_configured(self) -> bool:
        return bool(self.llm_enabled and self.llm_api_key and self.llm_base_url and self.llm_model)


def get_settings() -> Settings:
    env = os.environ.get
    origins = env("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return Settings(
        allowed_origins=[o.strip() for o in origins.split(",") if o.strip()],
        max_upload_mb=int(env("MAX_UPLOAD_MB", "5")),
        max_rows=int(env("MAX_ROWS", "5000")),
        sentiment_mode=env("SENTIMENT_MODE", "auto").lower(),
        model_name=env("SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest"),
        llm_enabled=env("LLM_ENABLED", "false").lower() == "true",
        llm_base_url=env("LLM_BASE_URL", ""),
        llm_model=env("LLM_MODEL", ""),
        llm_api_key=env("LLM_API_KEY", ""),
        category_config_path=env("CATEGORY_CONFIG_PATH", ""),
    )
