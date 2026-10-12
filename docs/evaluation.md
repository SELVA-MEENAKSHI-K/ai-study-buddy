# Study Master evaluation

## Automated frontend checks

Frontend tests use mocked `/api` responses and do not call Ollama, Bedrock, or AWS. Current coverage includes:

1. Send a question, show loading state, render the answer.
2. Reject empty input without an API call.
3. Send the selected learning mode.
4. Request an alternative explanation with the original question and action.
5. Show a friendly retry after a service failure.
6. Generate a quiz, select an answer, check the score feedback, and verify the quiz API payload.
7. Route pasted code through the `code` action and show the answer.
8. Ask for confirmation before clearing session history.

Result: 8 frontend tests passed after the final follow-up suggestion-row/CSS changes. They use mocked responses and make no Bedrock requests.

## Backend checks

The backend test suite in `backend/tests/test_api.py` covers input validation, selected mode and history, legacy and new explanation actions, quiz JSON validation, friendly model failure, timeout, health provider, and request throttling. Result: 11 API tests passed. They mock model calls and make no Bedrock requests; this Windows environment needed local socket/loopback permission for FastAPI's TestClient.

## Live model check

An earlier Vercel production version made a real Bedrock Nova Lite request for an SQL joins practice question and returned a response. This was a manual smoke check, not a full model evaluation, and it did not exercise the newly added quiz/code/notes actions. Local Ollama requests use the installed local model and incur local compute/disk use; live Bedrock requests incur model usage charges.

## Manual review still needed

- Check that a beginner response uses simple language, an exam response is structured, and a practical response includes an exercise.
- Review “Explain simply,” “Real-world example,” and “Exam answer” for recursion, SQL joins, and binary search. Confirm the original question does not need to be retyped.
- Review five generated quiz items for one unambiguous correct answer and accurate explanations; check the final score.
- Paste a short snippet and verify that the answer does not claim it was executed.
- Paste class notes and verify that the summary sticks to the provided notes and labels extra context.
- Check new/reopen/clear-history behavior and narrow desktop/mobile layouts, keyboard focus, and reduced-motion behavior.

No real-user feedback has been collected. Automated mocked checks do not prove factual correctness, model quality, accessibility conformance, or educational effectiveness.
