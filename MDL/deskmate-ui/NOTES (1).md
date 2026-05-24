# Design Notes — DeskMate

Decisions I'd defend. Everything else was straightforward.

---

## 1. Two LLM calls per request, not one

**Call 1 (router):** LLM reads the user message, returns structured JSON — which tool to call and with what parameters.  
**Call 2 (reply generator):** LLM receives the tool result as injected context, returns a natural language reply.

I split them because the two jobs have opposing requirements. The router needs deterministic, parseable output — low temperature, strict JSON, examples in the prompt. The reply generator needs expressive natural language. Merging them into one call risks the model mixing concerns: generating prose before the JSON, or producing inconsistent structure.

**The cost:** 2× latency, 2× API calls per request.  
**The better production approach:** OpenAI-style function calling, where the model natively returns structured tool_call objects and generates the reply in one round trip. I didn't use it here because it adds implementation complexity that obscures the architecture for a POC.

---

## 2. LLM as router, not keyword matching

Intent detection is done by the LLM, not by `if message.includes('password')`.

A keyword router breaks on natural variation — "I'm locked out", "can't log in", "forgot my creds" all mean password reset but none contain the word "password". The LLM handles these correctly without explicit rules for every phrasing.

**The cost:** Implicit, not auditable in the same way a keyword map is.  
**The mitigation:** The router prompt uses concrete examples and strict output rules. Temperature 0.2 keeps output consistent.

---

## 3. Grounding — LLM phrases, never invents

The LLM never generates ticket IDs, entitlement status, or employee data. All factual content is fetched from `mockSystems.js` first and injected into the prompt as structured JSON context. The LLM's only job in Call 2 is to turn that data into a natural sentence.

This eliminates hallucination on facts. The model cannot invent TCK9999 because the real ticket ID is already in its context before it generates a single word.

---

## 4. pendingRequests for multi-turn — not conversation history

When a user says "I need software access" without naming software, the server sets a flag and asks for clarification. The next message is treated as the software name.

I chose this over passing full conversation history because it handles the one specific ambiguity precisely and cheaply. Full history would also work but adds frontend complexity and context window overhead for a case that only needs one flag.

**What I'd change with more time:** Replace this with proper conversation history passed from the frontend, and let the LLM handle clarification naturally. The flag approach is brittle if the conversation has more than two turns of ambiguity.

---

## 5. mockSystems.js — shape mirrors production intent

The mock is designed to look like real IT system data, not minimal test data. Employees have IDs, departments, entitlement arrays, VPN status. Tickets have IDs, types, priorities, statuses, timestamps. Operations are named after what real integrations would look like — checkEntitlement, createTicket, resetVpn.

The interface between `server.js` and `mockSystems.js` is a deliberate contract. In production you swap the implementation — ServiceNow, Microsoft Graph, Azure AD — without touching the contract. The mock makes the same design decisions a real integration would, so the architecture doesn't change when the data source does.

---

## 6. Groq over OpenAI

Free tier, fast inference, and Groq's API is 100% OpenAI-compatible. Swapping to GPT-4 is one line: remove `baseURL`, change the key. I chose portability over provider lock-in from the start so the production path is trivial.

