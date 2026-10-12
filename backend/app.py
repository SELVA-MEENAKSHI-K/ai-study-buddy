import asyncio
import logging
from pathlib import Path
from typing import Literal

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


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=settings.max_message_chars)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=settings.max_message_chars)
    mode: Literal["beginner", "exam", "practical"] = "beginner"
    history: list[Message] = Field(default_factory=list, max_length=24)
    explain_another_way: bool = False


@app.get("/api/health")
async def health():
    if settings.provider == "ollama":
        return {"status": "ok", "model": settings.ollama_model, "provider": "Ollama (local)"}
    return {"status": "ok", "model": settings.model_id, "provider": "Amazon Bedrock"}


@app.post("/api/chat")
async def chat(payload: ChatRequest, http_request: Request):
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
            ),
            timeout=settings.timeout_seconds,
        )
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="The study buddy took too long to respond. Please try again.")
    except Exception as exc:
        logger.exception("AI request failed (%s)", type(exc).__name__)
        hint = "Check that Ollama is running and the selected model is downloaded, then retry." if settings.provider == "ollama" else "Check your AWS Bedrock setup, then retry."
        raise HTTPException(status_code=503, detail=f"The AI service is unavailable right now. {hint}")
    if not response:
        raise HTTPException(status_code=503, detail="The AI service returned an empty response. Please retry.")
    return {"answer": response}


frontend_dist = Path(__file__).resolve().parents[1] / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
