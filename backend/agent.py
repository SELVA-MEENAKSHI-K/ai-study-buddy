import json
import re
from urllib.request import Request, urlopen

from .config import settings
from .prompts import MODE_GUIDANCE, SYSTEM_PROMPT

ACTION_GUIDANCE = {
    "chat": "Answer the student's study question directly.",
    "explain_simple": "Explain the same concept in simpler words and shorter sentences. Preserve useful facts.",
    "real_world_example": "Give a fresh practical example and a relatable real-world analogy for the same concept.",
    "exam_answer": "Format as an exam-ready answer with Definition, Explanation, Important points, Example, and a short Conclusion.",
    "follow_up": "Continue from the conversation context and answer the student's follow-up.",
    "code": "Explain the submitted code step by step. Do not claim it was executed. Distinguish expected output that can be reasoned about from output you have not run. Mention likely errors and fixes where useful.",
    "notes": "Simplify and summarize only the supplied study notes. Extract key points and definitions. Clearly mark any extra context not present in the notes; do not invent missing facts.",
    "quiz": "Create exactly one multiple-choice question about the requested topic. Return only a JSON object with keys topic, question, options (array of exactly four strings), correct_index (integer 0 through 3), explanation (string). Ensure exactly one best answer and a helpful explanation.",
}


def _text(result) -> str:
    value = getattr(result, "message", None)
    if isinstance(value, dict):
        content = value.get("content", [])
        text = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
        if text:
            value = text
        else:
            value = str(result)
    else:
        value = str(result)
    value = re.sub(r"<thinking>.*?</thinking>", "", value, flags=re.IGNORECASE | re.DOTALL)
    return value.strip()


def answer(
    question: str,
    mode: str,
    history: list[dict],
    alternate: bool = False,
    vercel_oidc_token: str | None = None,
    action: str = "chat",
) -> str:
    transcript = "\n".join(f"{item['role'].capitalize()}: {item['content']}" for item in history[-settings.max_history_messages:])
    mode_text = MODE_GUIDANCE[mode]
    if alternate:
        mode_text += " The student wants the previous explanation another way: give a simpler version, then one practical example and one real-world analogy. Do not ask them to repeat the original question."
    action_text = ACTION_GUIDANCE.get(action, ACTION_GUIDANCE["chat"])
    if alternate:
        action_text += " Give a simpler explanation, then one practical example and one real-world analogy."
    prompt = f"Learning mode: {mode}. {mode_text}\nTask: {action_text}\n\nRecent conversation (context only):\n{transcript or '(none)'}\n\nStudent's current request: {question}"
    if settings.provider == "ollama":
        payload = json.dumps({
            "model": settings.ollama_model,
            "stream": False,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "options": {"temperature": 0.4, "num_predict": 900},
        }).encode("utf-8")
        request = Request(f"{settings.ollama_url.rstrip('/')}/api/chat", data=payload, headers={"Content-Type": "application/json"})
        with urlopen(request, timeout=settings.timeout_seconds) as response:
            result = json.loads(response.read().decode("utf-8"))
        return result.get("message", {}).get("content", "").strip()

    import boto3

    from strands import Agent
    from strands.models import BedrockModel
    from .tools import learning_resource_finder

    boto_session = None
    if settings.aws_role_arn and vercel_oidc_token:
        sts = boto3.client("sts", region_name=settings.region)
        assumed = sts.assume_role_with_web_identity(
            RoleArn=settings.aws_role_arn,
            RoleSessionName="study-buddy-vercel",
            WebIdentityToken=vercel_oidc_token,
            DurationSeconds=900,
        )["Credentials"]
        boto_session = boto3.Session(
            aws_access_key_id=assumed["AccessKeyId"],
            aws_secret_access_key=assumed["SecretAccessKey"],
            aws_session_token=assumed["SessionToken"],
            region_name=settings.region,
        )

    model_options = {"boto_session": boto_session} if boto_session else {"region_name": settings.region}
    model = BedrockModel(
        model_id=settings.model_id,
        max_tokens=900,
        temperature=0.4,
        **model_options,
    )
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT, tools=[learning_resource_finder])
    return _text(agent(prompt))
