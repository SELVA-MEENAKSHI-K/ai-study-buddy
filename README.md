# AI Study Buddy

A responsive learning companion for college students studying programming and computer science. The React client talks to a FastAPI backend; the backend creates a Strands Agents SDK agent using Amazon Bedrock. Model credentials stay on the server and are read from the standard AWS credential chain (local AWS profile, environment, or IAM role).

## Features

- Friendly concept explanations with Beginner, Exam prep, and Practical response modes.
- Short session conversation context and recent-question recall, stored only in the current browser tab.
- **Explain it another way** reuses the last question and asks for simpler wording, a practical example, and a real-world analogy.
- A curated resource-finder tool with known links for Python, JavaScript, web development, computer science, algorithms, Git, Java, and SQL.
- Request validation, bounded input/history, model timeout, non-sensitive error messages, and retry UI.
- Responsive layout, keyboard send (`Enter`; `Shift+Enter` for a new line), and accessible labels.

## Requirements and cost

Python 3.11+ and Node.js 20.19+ are recommended. Amazon Bedrock model access and valid AWS credentials are required for live answers. This project defaults to the `us.amazon.nova-lite-v1:0` US geographic inference profile and `us-east-1`; change `BEDROCK_MODEL_ID` and `AWS_REGION` for a supported deployment. Availability and model access can vary by account, region, and provider requirements. Bedrock inference is billable by usage; consult the [current Amazon Bedrock pricing page](https://aws.amazon.com/bedrock/pricing/) before use. The default model and profile are documented in the [Nova Lite model card](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-lite.html). Strands uses the AWS SDK credential chain; the [Strands Bedrock setup guide](https://strandsagents.com/docs/user-guide/sdk/model-providers/amazon-bedrock/) documents the model provider configuration.

For a no-cloud-billing local demo, set `AI_PROVIDER=ollama`. Install Ollama from its official site, download a local model such as `qwen2.5:3b`, and keep Ollama running while using the app. This route sends prompts to the local Ollama service and does not invoke Bedrock. The model download uses disk space and local compute.

On Windows environments where the compiled Pydantic component is blocked by application-control policy, use `python -m backend.local_server` for the Ollama-only backend. It uses Python's standard-library HTTP server and keeps the AWS/Strands FastAPI path unchanged for Bedrock runs.

## Run locally (PowerShell)

For the prepared local Ollama demo on Windows, first open the Ollama app from Start so its local service is running, then double-click `Start Study Buddy.bat`. It opens the backend and frontend terminals and the app in your browser. The backend uses the `AI_PROVIDER=ollama` setting in `backend/.env`.

1. For Bedrock, configure AWS credentials using your normal AWS profile or an IAM role. Grant only the Bedrock invocation permission needed for the selected model/profile, and enable model access in the target account/region. Do not put credentials in this repository. For the local no-cloud-billing option, install Ollama and download the model first, then set `AI_PROVIDER=ollama` in your environment.
2. In one terminal:

   ```powershell
   cd backend
   py -3.11 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -r requirements.txt
   Copy-Item .env.example .env
   uvicorn backend.app:app --reload --app-dir ..
   ```

   The backend loads non-secret model settings from `backend/.env` at startup. AWS credentials should be configured outside the app using the standard AWS credential chain; do not put them in `.env` or commit them.
3. In another terminal:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the local URL Vite prints (usually `http://localhost:5173`). The Vite development server proxies `/api` to the backend at port 8000.

## Deploy the full app on Vercel

The repository root contains the Vercel configuration. Import `SELVA-MEENAKSHI-K/ai-study-buddy` from GitHub in Vercel and keep the project root set to the repository root. Vercel builds the React app and runs the FastAPI backend as a Python Function; FastAPI serves the built frontend from the same deployment.

For live AI answers, set `AI_PROVIDER=bedrock`, `AWS_REGION=us-east-1`, and `BEDROCK_MODEL_ID=us.amazon.nova-lite-v1:0` in the Vercel project's Environment Variables, and configure AWS credentials securely for the backend. Never add AWS credentials to GitHub or the frontend. Bedrock model calls are billed by usage. The Vercel Hobby hosting plan is free within its personal-project limits, but it does not make Bedrock inference free. Ollama is local to your computer and cannot provide AI answers to the deployed site.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `AWS_REGION` | `us-east-1` | Bedrock runtime region |
| `BEDROCK_MODEL_ID` | `us.amazon.nova-lite-v1:0` | Model or inference profile ID |
| `MODEL_TIMEOUT_SECONDS` | `45` | Maximum response wait |
| `MAX_HISTORY_MESSAGES` | `12` | Conversation turns included as context |
| `MAX_MESSAGE_CHARS` | `4000` | Per-message API input limit |

Health check: `GET /api/health`. Chat and alternate explanation: `POST /api/chat`.

## Tests

Backend tests use a mocked agent function and do not invoke Bedrock:

```powershell
cd backend
python -m pytest
```

Frontend tests mock the API:

```powershell
cd frontend
npm test
```

## Challenge article and evaluation

See [`docs/builder-center-article.md`](docs/builder-center-article.md) for a 500+ word article draft. It includes the `#agents` tag and implementation details; edit the challenge/tool descriptions to match the tools you actually used before publishing. The account profile checklist is in [`docs/challenge-checklist.md`](docs/challenge-checklist.md). The predefined “Explain it another way” evaluation cases are in [`docs/evaluation.md`](docs/evaluation.md). Automated checks are included, but results must be run and recorded before reporting that the feature passed evaluation. The app has not been deployed and the article has not been published.
