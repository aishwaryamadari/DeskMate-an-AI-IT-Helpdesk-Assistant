# DeskMate — Production Design Note

How I would take this POC to production on Azure. I've focused on the decisions that are load-bearing. Breadth isn't the point here.

---

## 1. LLM — Azure OpenAI Service

**POC:** Groq free tier, public API endpoint.  
**Production:** Azure OpenAI Service with a private endpoint.

With Groq, every prompt — employee names, ticket details, access request content — leaves your Azure tenant and goes to a third-party server. For an IT helpdesk handling access requests and password resets, that's a compliance problem before it's a technical one.

Azure OpenAI gives you GPT-4 on infrastructure inside your network boundary. Data doesn't leave your tenant. The SDK interface is identical — the code change is one line.

**The risk:** Azure OpenAI has regional quota limits. If your deployment region hits capacity, requests fail. Mitigation: provision in two regions, implement retry with fallback to the secondary.

---

## 2. Authentication — Azure Active Directory (Entra ID)

**POC:** `employeeId` comes from the request body. The user types it in. Anyone can impersonate anyone.  
**Production:** Employee identity comes from a validated Azure AD JWT token.

Every request includes a bearer token issued by Azure AD after SSO login. The backend validates the token signature and extracts identity from the claims — never from user-supplied input. Role-based access control comes with it: IT admins see all tickets, employees see only their own.

**What this changes in the code:** `employeeId` moves from `req.body` to the decoded JWT. One line in the route handler. This is the largest security gap in the current design and the cheapest fix in production.

---

## 3. State — Redis + Persistent Database

**POC:** `pendingRequests` is an in-memory object. Ticket data is an in-memory array. Both reset on restart. Neither works across multiple backend instances.

**Redis (Azure Cache for Redis):** Replaces `pendingRequests`. Conversation state stored with a short TTL. Works across all instances, survives a restart.

**Azure Cosmos DB or Azure SQL:** Replaces the in-memory ticket array. Tickets persist. The data shape in `mockSystems.js` was designed to map cleanly to a real schema — each ticket object becomes a document or row without restructuring. I'd choose Cosmos DB for read-heavy query patterns by ID; Azure SQL if the team wants relational joins across employees, tickets, and entitlements.

---

## 4. Observability — Application Insights

**POC:** `trace` array returned in the API response. Visible in the UI. Not stored anywhere.  
**Production:** Structured telemetry via Azure Application Insights.

Every request gets a correlation ID at entry. It flows through every step — LLM router, tool execution, reply generation, external API calls. The trace steps I already emit become telemetry events tagged with that ID.

The `trace` array structure maps directly onto custom telemetry events. The migration is additive — keep the trace in the response for developers, also emit it as persistent telemetry. For any production incident you can query every step of a specific request. You can alert on LLM latency spikes, tool failure rates, and out-of-scope query volume.

---

## The risk I'd actually lose sleep over

**LLM non-determinism on write operations.**

`createTicket` is called based on what the LLM decides. If the router misclassifies a request — wrong tool, wrong software name, wrong priority — a ticket gets written to the real ticketing system with wrong data. In a POC this is harmless. In production, a wrongly created ticket in ServiceNow triggers real workflows: SLA timers, team assignments, manager notifications.

**The fix:** A validation layer between LLM decision and execution. The LLM outputs a proposed action in structured JSON. Deterministic code validates it — is the tool name in the allowed list? Are required fields present and within expected values? Only after validation does the write execute.

The LLM suggests. The code decides.

This single change is what separates a trustworthy production system from a demo that works most of the time.

---

## What I deliberately left out

- **Rate limiting** — Azure API Management at the gateway layer. Not an application-level decision.
- **Multi-tenancy** — Single-tenant enterprise deployment is the right starting point.
- **CI/CD** — Standard Azure DevOps or GitHub Actions. No novel decisions.
- **Frontend hosting** — Azure Static Web Apps. Trivial.

These are real concerns with obvious answers. The four decisions above are where the actual thinking lives.

