# “Explain it another way” evaluation

## Predefined test cases

1. **Original question reuse:** ask “Explain recursion in beginner terms,” receive a response, then select “Explain it another way.” Confirm the second API payload contains the same question, sets `explain_another_way` to `true`, and does not require re-entry.
2. **Three requested angles:** request the alternate response for recursion, SQL joins, and binary search. Human reviewer checks each for simpler wording, a practical example, and a real-world analogy. Record pass/fail per criterion; do not infer model quality from one run.
3. **Mode preserved:** switch each of Beginner, Exam prep, and Practical modes before asking for another explanation. Confirm the selected mode reaches the API and the answer format follows it.
4. **Service failure:** return a mocked unavailable response. Confirm a clear error is shown and Retry resends the original question.
5. **Empty input:** submit whitespace only. Confirm no request is made.

Frontend tests implement cases 1, 3, 4, and 5 with mocked API responses. Backend tests verify mode and alternate flags, validation, safe service failures, and timeout handling. Run both suites and record results here before claiming they pass. Model-generated content needs separate manual review; automated request-flow tests do not prove factual correctness or learning effectiveness.

## Results

Not run yet. No real-user evaluation or feedback has been collected.
