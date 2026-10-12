import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


@dataclass(frozen=True)
class Settings:
    provider: str = os.getenv("AI_PROVIDER", "bedrock").strip().lower()
    model_id: str = os.getenv("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
    ollama_url: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    region: str = os.getenv("AWS_REGION", os.getenv("AWS_DEFAULT_REGION", "us-east-1"))
    aws_role_arn: str = os.getenv("AWS_ROLE_ARN", "").strip()
    timeout_seconds: float = float(os.getenv("MODEL_TIMEOUT_SECONDS", "45"))
    max_history_messages: int = int(os.getenv("MAX_HISTORY_MESSAGES", "12"))
    max_message_chars: int = int(os.getenv("MAX_MESSAGE_CHARS", "4000"))


settings = Settings()
