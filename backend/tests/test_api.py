from fastapi.testclient import TestClient

from backend import app as app_module

client = TestClient(app_module.app)


def test_empty_question_rejected():
    response = client.post("/api/chat", json={"question": "   "})
    assert response.status_code == 422
    assert "enter a question" in response.json()["detail"].lower()


def test_chat_passes_mode_and_returns_answer(monkeypatch):
    seen = {}
    def fake_answer(question, mode, history, alternate=False):
        seen.update(question=question, mode=mode, history=history, alternate=alternate)
        return "A stack is last-in, first-out."
    monkeypatch.setattr(app_module, "answer", fake_answer)
    response = client.post("/api/chat", json={"question": "What is a stack?", "mode": "exam", "history": [{"role": "user", "content": "Explain queues"}]})
    assert response.status_code == 200
    assert response.json() == {"answer": "A stack is last-in, first-out."}
    assert seen["mode"] == "exam" and seen["history"][0]["content"] == "Explain queues"


def test_explain_another_way_flag_reaches_agent(monkeypatch):
    seen = {}
    monkeypatch.setattr(app_module, "answer", lambda question, mode, history, alternate=False: seen.update(alternate=alternate) or "Analogy")
    response = client.post("/api/chat", json={"question": "Explain recursion again", "explain_another_way": True})
    assert response.status_code == 200 and seen["alternate"] is True


def test_invalid_mode_and_oversize_question_rejected():
    assert client.post("/api/chat", json={"question": "Hello", "mode": "expert"}).status_code == 422
    assert client.post("/api/chat", json={"question": "x" * 4001}).status_code == 422


def test_model_failure_returns_safe_message(monkeypatch):
    def fail(*args, **kwargs): raise RuntimeError("secret detail must not escape")
    monkeypatch.setattr(app_module, "answer", fail)
    response = client.post("/api/chat", json={"question": "Explain pointers"})
    assert response.status_code == 503
    assert "secret detail" not in response.text
    assert "unavailable" in response.json()["detail"].lower()


def test_timeout_returns_retryable_message(monkeypatch):
    async def too_slow(*args, **kwargs):
        import asyncio
        await asyncio.sleep(0.03)
        return "late"
    monkeypatch.setattr(app_module, "settings", type("Settings", (), {"timeout_seconds": 0.001})())
    monkeypatch.setattr(app_module.asyncio, "to_thread", too_slow)
    response = client.post("/api/chat", json={"question": "Explain pointers"})
    assert response.status_code == 504
    assert "try again" in response.json()["detail"].lower()


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["provider"] == "Amazon Bedrock"
