# AI Study Buddy: a friendly agent for learning computer science

College students learning programming often hit a frustrating wall: a textbook definition makes sense on paper, but the idea still does not click. AI Study Buddy is a learning companion for that moment. It helps students ask questions about programming and computer science, understand difficult ideas in plain language, practise for exams, and make progress when they are stuck.

## What it does and who it is for

The app is designed for college students learning subjects such as Python, data structures, databases, and computer networks. A student can ask a question and select Beginner, Exam Prep, or Practical mode. Beginner mode favors plain language and short explanations; Exam Prep structures an answer for revision; Practical mode asks the agent to teach through examples and exercises. Students can paste code for an explanation or paste notes for a grounded summary. A generated quiz lets them answer multiple-choice questions, read the explanation, and see a five-question score.

The design tries to make the next step clear. The welcome screen offers routes to concept explanations, quizzes, code explanations, and note simplification. The chat keeps a small amount of conversation context so follow-up questions make sense. Conversations can be reopened, started over, or cleared with confirmation. History is saved in session storage for the current browser tab; it is not permanent storage, and the app does not ask for a student account or school information.

## The delightful detail

The signature interaction is “Explain it another way.” If a correct explanation still feels confusing, the student can ask for a simpler version, a real-world example, or an exam-style answer without typing the original question again. Contextual suggestions such as “Explain more,” “Compare concepts,” and “Test my knowledge” make the follow-up easy to choose. The intent is to lower the effort needed to say, “I am still working on it.”

I evaluated the request flow with frontend tests that mock the API. The checks cover sending a question, empty input, selected learning mode, reusing the original question for a simpler explanation, retrying after a service failure, generating and scoring a quiz response, sending code through the tutor, and confirming before clearing history. Eight frontend tests passed in the local run. These tests establish that the interface sends the intended requests and handles responses; they do not establish that every model response is correct or that students learn more. A prior deployed version also returned a live Amazon Bedrock answer to a SQL joins practice request. The enhanced quiz, code, notes, and refreshed interface described here are local source changes and have not yet been redeployed or manually reviewed with real students. No student feedback is claimed.

## How it is built

The frontend uses React, Vite, Tailwind CSS, and Lucide icons. It includes responsive navigation, accessible labels, keyboard submission, loading and retry states, and a small safe Markdown renderer for headings, lists, and code. The Python backend uses FastAPI and the Strands Agents SDK. Its prompts vary with learning mode and task; code explanations are instructed not to claim execution, and notes summaries are instructed to distinguish supplied material from extra context. Quiz output is requested as structured JSON and checked before it is shown as a real quiz. Request sizes and conversation history are bounded, model calls have a timeout, and the server applies a lightweight per-process request throttle. The throttle is best-effort in serverless hosting because instances do not share state.

There are two model paths. For a local no-cloud-inference-cost demo, the app can use Ollama and a model installed on the student’s computer. The project also has a live Amazon Bedrock path. Strands connects the agent to Amazon Nova Lite using the `us.amazon.nova-lite-v1:0` US inference profile in `us-east-1`. For the Vercel deployment, the backend uses Vercel OpenID Connect to assume a scoped AWS IAM role for Bedrock invocation; it does not put long-lived AWS access keys in the frontend or repository. The app’s existing Vercel deployment was manually checked with a real Bedrock response on October 12, 2026. Bedrock requests are usage-billed, so a local Ollama run avoids those inference charges while using the computer’s CPU/GPU and disk space.

The main implementation challenge was making the same student workflow operate through both Bedrock and local Ollama. I kept model calls on the backend and reused the same task prompts across those providers. A second challenge was making an alternate explanation preserve context instead of asking the student to copy their question again. The frontend now sends the original question and action to the agent, and the backend passes a concise task instruction with the bounded conversation context.

## Architecture, tools, and proof

React/Vite sends requests to FastAPI. FastAPI calls a Strands agent, which invokes Nova Lite through Amazon Bedrock or, for a local demo, the Ollama service. AWS IAM provides the scoped role and OIDC trust used by the deployed Bedrock path. Vercel hosts the existing web deployment; Vercel is the hosting provider, not an AWS service. The reusable agent tool is a curated learning-resource finder for selected computer-science topics.

The existing deployed chat version can be viewed at [AI Study Buddy](https://ai-study-buddy-lovat-delta.vercel.app/). It predates the latest interface and quiz/code/notes changes, so use it only as proof of the earlier working Bedrock chat. The enhanced source code is in the public [GitHub repository](https://github.com/SELVA-MEENAKSHI-K/ai-study-buddy); a new deployment is still needed before the live app demonstrates these changes.

I learned to keep model credentials on the backend, use short-lived OIDC role credentials for a deployed Bedrock call, and treat agent features as complete only when both the user action and API path work. I also learned that mock tests can verify interaction behavior without proving model quality; live model review and student feedback remain separate evaluation steps.

#agents
