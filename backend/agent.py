import json
from urllib.request import Request, urlopen

from .config import settings
from .prompts import MODE_GUIDANCE, SYSTEM_PROMPT


def _text(result) -> str:
    value = getattr(result, "message", None)
    if isinstance(value, dict):
        content = value.get("content", [])
        text = "\n".join(part.get("text", "") for part in content if isinstance(part, dict))
        if text:
            return text.strip()
    return str(result).strip()


def answer(
    question: str,
    mode: str,
    history: list[dict],
    alternate: bool = False,
    vercel_oidc_token: str | None = None,
) -> str:
    transcript = "\n".join(f"{item['role'].capitalize()}: {item['content']}" for item in history[-settings.max_history_messages:])
    mode_text = MODE_GUIDANCE[mode]
    if alternate:
        mode_text += " The student wants the previous explanation another way: give a simpler version, then one practical example and one real-world analogy. Do not ask them to repeat the original question."
    prompt = f"Learning mode: {mode}. {mode_text}\n\nRecent conversation (context only):\n{transcript or '(none)'}\n\nStudent's current question: {question}"
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

    model = BedrockModel(
        model_id=settings.model_id,
        region_name=settings.region,
        max_tokens=900,
        temperature=0.4,
        boto_session=boto_session,
    )
    agent = Agent(model=model, system_prompt=SYSTEM_PROMPT, tools=[learning_resource_finder])
    return _text(agent(prompt))
