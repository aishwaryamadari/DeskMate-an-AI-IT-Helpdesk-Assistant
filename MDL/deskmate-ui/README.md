# DeskMate — AI IT Helpdesk Assistant (POC)

An employee types a request in plain English. DeskMate decides what to do, reads from or writes to internal IT systems, and replies through an LLM with something useful — no human agent in the loop.

---

## Setup

**Prerequisites:** Node.js v18+, a free Groq API key from [console.groq.com](https://console.groq.com)

### Backend

```bash
cd deskmate-ui/deskmate-backend
npm install
```

Create a `.env` file:

```
GROQ_API_KEY=your_key_here
```

```bash
node server.js
# Server running on port 3001
```

### Frontend

```bash
cd deskmate-ui
npm install
npm run dev
# http://localhost:5173
```

The default employee ID is `EMP101`. Type any IT helpdesk query.

---

## Architecture

Two processes: a React frontend (Vite, port 5173) and an Express backend (Node, port 3001). They communicate over a single REST endpoint — `POST /api/chat`.

Every request follows the same path:

```
User message
    → verify employee (mockSystems.js)
    → LLM Call 1: router — returns JSON tool decision
    → execute tool (mockSystems.js read/write)
    → LLM Call 2: reply generator — receives tool result as context, returns natural language
    → { reply, trace } back to the frontend
```

**Why two LLM calls:** The router needs deterministic JSON output (low temperature, strict format). The reply generator needs expressive natural language. These are opposing requirements — merging them into one call risks inconsistent JSON structure or prose contaminating the output. The cost is 2× latency, which is acceptable for a POC.

**Why LLM-as-router instead of keyword matching:** Keyword rules break on natural variation — "I'm locked out", "can't sign in", and "forgot my credentials" all mean password reset but none contain the word "password". The LLM handles these correctly without explicit rules for every phrasing.

**Why the LLM never invents facts:** All factual content — ticket IDs, entitlement status, software names — is fetched from `mockSystems.js` first and injected into the prompt as structured JSON. The LLM in Call 2 only phrases the result. It cannot hallucinate a ticket ID because the real one is already in its context.

**mockSystems.js** is an in-memory module simulating a real IT backend. Employees have IDs, departments, and entitlement arrays. Tickets have IDs, types, priorities, statuses, and timestamps. The data shape and operation names mirror what a real ServiceNow integration would look like — this was intentional, so the design decisions translate directly to production.

---

## What it handles

| Query shape | What happens |
|---|---|
| "Do I have access to Figma?" | Single read — checks entitlement |
| "I need Adobe Creative Suite" | Read then conditional write — checks entitlement, creates ticket if not entitled |
| "Reset my password" | Single write — calls password reset mock |
| "Show my open tickets" | Single read — returns all open tickets |
| "Close ticket TCK1001" | Single write — closes that ticket |
| Anything outside IT helpdesk scope | Refused gracefully |

---

## Observable execution

Every response includes a `trace` array. The UI shows it in a collapsible panel as formatted JSON. It records which tool the router selected and what the mock system returned — enough to trace any request end-to-end.

---

## Test data

Five  employees are pre-loaded, one of them is : **EMP101 — Aishwarya Madari, Design**. Entitled to Slack and Figma only. Asking for any other software triggers ticket creation. Two tickets are pre-seeded: TCK1001 (Adobe, high priority) and TCK1002 (Canvas, medium priority).
