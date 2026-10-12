import asyncio
import json
import logging
from pathlib import Path
from typing import Literal
from time import monotonic

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .agent import answer
from .config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("studybuddy")
app = FastAPI(title="AI Study Buddy API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_methods=["GET", "POST"], allow_headers=["Content-Type"])
_request_times: dict[str, list[float]] = {}
_RATE_WINDOW_SECONDS = 60
_RATE_LIMIT = 20


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=settings.max_message_chars)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_message_chars)
    mode: Literal["beginner", "exam", "practical"] = "beginner"
    history: list[Message] = Field(default_factory=list, max_length=24)
    explain_another_way: bool = False
    action: Literal["chat", "explain_simple", "real_world_example", "exam_answer", "follow_up", "code", "notes"] = "chat"


class QuizRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=120)
    mode: Literal["beginner", "exam", "practical"] = "beginner"


def enforce_rate_limit(key: str):
    now = monotonic()
    recent = [stamp for stamp in _request_times.get(key, []) if now - stamp < _RATE_WINDOW_SECONDS]
    if len(recent) >= _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="You’ve asked several questions just now. Wait a minute, then try again.")
    recent.append(now)
    _request_times[key] = recent


def _client_key(http_request: Request) -> str:
    # Use the connection peer, not a user-supplied forwarded header.
    return http_request.client.host if http_request.client else "unknown"


@app.get("/api/health")
async def health():
    if settings.provider == "ollama":
        return {"status": "ok", "model": settings.ollama_model, "provider": "Ollama (local)"}
    return {"status": "ok", "model": settings.model_id, "provider": "Amazon Bedrock"}


@app.post("/api/chat")
async def chat(payload: ChatRequest, http_request: Request):
    enforce_rate_limit(_client_key(http_request))
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Please enter a question before sending.")
    history = [item.model_dump() for item in payload.history]
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                answer,
                question,
                payload.mode,
                history,
                payload.explain_another_way,
                http_request.headers.get("x-vercel-oidc-token"),
                payload.action,
            ),
            timeout=settings.timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="The study buddy took too long to respond. Please try again.")
    except Exception as exc:
        logger.warning("AI request failed (%s)", type(exc).__name__)
        hint = "Check that Ollama is running and the selected model is downloaded, then retry." if settings.provider == "ollama" else "Check your AWS Bedrock setup, then retry."
        raise HTTPException(status_code=503, detail=f"The AI service is unavailable right now. {hint}")
    if not response:
        raise HTTPException(status_code=503, detail="The AI service returned an empty response. Please retry.")
    return {"answer": response}


@app.post("/api/quiz")
async def generate_quiz(payload: QuizRequest, http_request: Request):
    enforce_rate_limit(_client_key(http_request))
    topic = payload.topic.strip()
    if not topic:
        raise HTTPException(status_code=422, detail="Enter a topic for your quiz.")
    try:
        raw = await asyncio.wait_for(
            asyncio.to_thread(
                answer,
                f"Create one multiple-choice practice question about: {topic}",
                payload.mode,
                [],
                False,
                http_request.headers.get("x-vercel-oidc-token"),
                "quiz",
            ),
            timeout=settings.timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="The quiz took too long to generate. Please try again.")
    except Exception as exc:
        logger.warning("Quiz request failed (%s)", type(exc).__name__)
        hint = "Check that Ollama is running and the selected model is downloaded, then retry." if settings.provider == "ollama" else "Check your AWS Bedrock setup, then retry."
        raise HTTPException(status_code=503, detail=f"The AI service is unavailable right now. {hint}")
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = json.loads(cleaned)
        if (not isinstance(data, dict) or not isinstance(data.get("topic"), str) or not isinstance(data.get("question"), str)
                or not isinstance(data.get("options"), list) or len(data["options"]) != 4
                or not all(isinstance(option, str) and option.strip() for option in data["options"])
                or type(data.get("correct_index")) is not int or data["correct_index"] not in range(4)
                or not isinstance(data.get("explanation"), str) or not data["explanation"].strip()):
            raise ValueError("invalid quiz shape")
    except (json.JSONDecodeError, ValueError, AttributeError):
        logger.warning("Quiz response was not valid structured output")
        raise HTTPException(status_code=502, detail="The quiz came back in an unreadable format. Please generate another one.")
    return data


frontend_dist = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
