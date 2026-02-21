# Guided Component Architect

A powerful agentic code-generation platform that transforms natural language descriptions into valid, governed Angular components. Built for the Pythrust Technologies Gen AI Engineer assignment.

## 🚀 Live Demo

- **Frontend**: [Vercel Deployment URL](https://pythrust-assignment.vercel.app)

## 🏗️ Architecture: The Agentic Loop

This project implements a self-correcting **Agentic Loop** to ensure that generated code is not only functional but also strictly adheres to a predefined **Design System**.

1. **Generation**: The user provides a prompt. The `generator` uses Groq (Llama-3-70b) to create a standalone Angular component.
2. **Validation**: A dedicated `validator` agent (Linter-Agent) inspects the output for:
   - **Design Token Compliance**: Ensures colors, fonts, and radii match `design_system.json`.
   - **Syntactic Integrity**: Checks for balanced brackets, required decorators, and valid Angular structure.
3. **Self-Correction**: If the validator flags errors, a `corrector` agent is triggered. It receives the original code and the error logs, then regenerates a "fixed" version.
4. **Live Preview**: Validated code is instantly rendered in a restricted **StackBlitz sandbox** within the UI.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Monaco Editor, StackBlitz SDK.
- **Backend**: FastAPI (Python), Groq LLM API.
- **Design System**: Centralized JSON-based token management.

## ⚙️ Setup Instructions

### Backend

1. Navigate to `/backend`.
2. Install dependencies: `pip install -r requirements.txt`.
3. Create a `.env` file with your `GROQ_API_KEY`.
4. Run the server: `uvicorn main:app --reload`.

### Frontend

1. Navigate to `/component-architect-main`.
2. Install dependencies: `npm install`.
3. Create a `.env` file with `VITE_API_URL=http://localhost:8000`.
4. Run the app: `npm run dev`.

## 🛡️ Security & Scaling (Note)

### Prompt Injection Prevention

We prevent prompt injection through **Context Isolation** and **Execution Sandboxing**. User input is treated as data, never as instructions. The system enforces strict structural validation—if the LLM deviates from the expected code format due to an injection attempt, the validator rejects the output. Finally, code execution is isolated within iframes (StackBlitz), preventing access to host session data.

### Scaling to Full-Page Apps

To scale, we move from single-component generation to **Architectural Orchestration**. The system first generates a "Manifest" of routes and layouts, then fulfills each component independently. We use a standardized **State Interface** (Angular Services) to ensure decoupled components can share data seamlessly across the entire page.

---
