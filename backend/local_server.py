"""Small standard-library HTTP server for the no-cloud Ollama demo."""

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from .agent import answer
from .config import settings


class Handler(BaseHTTPRequestHandler):
    server_version = "StudyBuddyLocal/1.0"

    def _send(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Access-Control-Allow-Origin", "http://localhost:5173")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self) -> None:
        self._send(204, {})

    def do_GET(self) -> None:
        if self.path == "/api/health":
            self._send(200, {"status": "ok", "model": settings.ollama_model, "provider": "Ollama (local)"})
        else:
            self._send(404, {"detail": "Not found"})

    def do_POST(self) -> None:
        if self.path not in {"/api/chat", "/api/quiz"}:
            self._send(404, {"detail": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 128_000:
                self._send(413, {"detail": "Please send a smaller message."})
                return
            payload = json.loads(self.rfile.read(length))
            mode = payload.get("mode", "beginner")
            if mode not in {"beginner", "exam", "practical"}:
                self._send(422, {"detail": "Please check the selected mode and conversation."})
                return
            if self.path == "/api/quiz":
                topic = str(payload.get("topic", "")).strip()
                if not topic or len(topic) > 120:
                    self._send(422, {"detail": "Enter a topic for your quiz (up to 120 characters)."})
                    return
                response = answer(f"Create one multiple-choice practice question about: {topic}", mode, [], action="quiz")
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                try:
                    quiz = json.loads(cleaned)
                    if (not isinstance(quiz, dict) or not isinstance(quiz.get("topic"), str)
                            or not isinstance(quiz.get("question"), str) or not isinstance(quiz.get("options"), list)
                            or len(quiz["options"]) != 4 or not all(isinstance(item, str) for item in quiz["options"])
                            or type(quiz.get("correct_index")) is not int or quiz["correct_index"] not in range(4)
                            or not isinstance(quiz.get("explanation"), str)):
                        raise ValueError("invalid quiz shape")
                except (json.JSONDecodeError, ValueError, AttributeError):
                    self._send(502, {"detail": "The quiz came back in an unreadable format. Please generate another one."})
                    return
                self._send(200, quiz)
                return
            question = str(payload.get("question", "")).strip()
            history = payload.get("history", [])
            action = payload.get("action", "chat")
            allowed_actions = {"chat", "explain_simple", "real_world_example", "exam_answer", "follow_up", "code", "notes"}
            if not question or len(question) > settings.max_message_chars:
                self._send(422, {"detail": "Please enter a question before sending."})
                return
            if not isinstance(history, list) or action not in allowed_actions:
                self._send(422, {"detail": "Please check the selected mode and conversation."})
                return
            response = answer(question, mode, history[-24:], bool(payload.get("explain_another_way", False)), action=action)
            if not response:
                self._send(503, {"detail": "The local model returned an empty response. Please retry."})
                return
            self._send(200, {"answer": response})
        except Exception:
            self._send(503, {"detail": "The local AI is unavailable. Check that Ollama is running with the selected model, then retry."})

    def log_message(self, format: str, *args: object) -> None:
        print("Study Buddy: " + format % args)


def main() -> None:
    if settings.provider != "ollama":
        raise SystemExit("Set AI_PROVIDER=ollama in backend/.env before starting local_server.")
    server = ThreadingHTTPServer(("127.0.0.1", 8000), Handler)
    print(f"AI Study Buddy local backend ready at http://127.0.0.1:8000 (model: {settings.ollama_model})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nAI Study Buddy backend stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
