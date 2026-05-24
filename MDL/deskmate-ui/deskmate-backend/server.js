// ==============================
// server.js
// ==============================

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import OpenAI from "openai";
import process from "process";

import {
  getEmployee,
  checkEntitlement,
  createTicket,
  getAllTickets,
  resetPassword,
  closeTickets,
  closeTicket,
  resetVpn,
  createVpnTicket,
} from "./mockSystems.js";

dotenv.config();

const app = express();

// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());

app.use(express.json());

app.use(helmet());

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
  })
);

// ==============================
// PENDING REQUESTS
// ==============================

const pendingRequests = {};

// ==============================
// OPENAI CLIENT
// ==============================

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// ==============================
// ASK LLM
// ==============================

async function askLLM(
  systemPrompt,
  userPrompt
) {

  const completion =
    await client.chat.completions.create({
      model:
        "llama-3.1-8b-instant",

      temperature: 0.2,

      messages: [
        {
          role: "system",
          content: systemPrompt,
        },

        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

  return completion
    .choices[0]
    .message.content.trim();
}

// ==============================
// DETECT PRIORITY
// ==============================

function detectPriority(message) {

  const lower =
    message.toLowerCase();

  // HIGH PRIORITY

  if (
    lower.includes("urgent") ||
    lower.includes("critical") ||
    lower.includes("immediately") ||
    lower.includes("asap") ||
    lower.includes("production down") ||
    lower.includes("cannot work") ||
    lower.includes("blocked") ||
    lower.includes("high priority") ||
    lower.includes("priority high") ||
    lower.includes("high")
  ) {

    return "high";
  }

  // LOW PRIORITY

  if (
    lower.includes("low priority") ||
    lower.includes("priority low") ||
    lower.includes("low") ||
    lower.includes("later") ||
    lower.includes("no rush")
  ) {

    return "low";
  }

  // MEDIUM PRIORITY

  if (
    lower.includes("medium priority") ||
    lower.includes("priority medium") ||
    lower.includes("medium") ||
    lower.includes("important") ||
    lower.includes("soon")
  ) {

    return "medium";
  }

  // DEFAULT

  return "medium";
}

// ==============================
// CHAT API
// ==============================

app.post(
  "/api/chat",

  async (req, res) => {

    try {

      const {
        employeeId,
        message,
      } = req.body;

      // ==============================
      // VALIDATION
      // ==============================

      if (
        typeof employeeId !== "string" ||
        typeof message !== "string" ||
        !employeeId.trim() ||
        !message.trim()
      ) {

        return res.status(400).json({
          reply:
            "Valid employeeId and message are required.",
        });
      }

      const employee =
        getEmployee(employeeId);

      if (!employee) {

        return res.status(404).json({
          reply:
            "Employee not found.",
        });
      }

      const trace = [];

      const lower =
        message.toLowerCase();

      trace.push({
        step: "request_received",
        employeeId,
        message,
      });

      // ==============================
// GREETING FLOW
// ==============================

if (
  lower === "hi" ||
  lower === "hello" ||
  lower === "hey" ||
  lower === "hii"
) {

  trace.push({
    step: "greeting_detected",
  });

  return res.json({
    reply:
`Hello ${employee.name} 👋

I am DeskMate AI Helpdesk Assistant.

I can help you with:
• Password reset
• VPN troubleshooting
• Software access requests
• Open ticket status
• Closing tickets

Examples:
• "reset my password"
• "vpn not connecting"
• "need access to Figma"
• "show open tickets"`,

    trace,
  });
}

      // ==============================
      // VPN FOLLOW UP FLOW
      // ==============================

      if (
        pendingRequests[
          employeeId
        ]?.type === "vpn"
      ) {

        trace.push({
          step: "pending_flow",
          type: "vpn",
        });

        // CREATE VPN TICKET

        if (
          lower.includes("raise") &&
          lower.includes("vpn") &&
          lower.includes("ticket")
        ) {

          delete pendingRequests[
            employeeId
          ];

          const ticket =
            createVpnTicket(
              employeeId,

              lower.includes("high")
                ? "high"
                : lower.includes(
                    "medium"
                  )
                ? "medium"
                : "low"
            );

          trace.push({
            step: "tool_result",
            tool: "createVpnTicket",
            result: ticket,
          });

          trace.push({
            step: "final_response",
            reply:
              "VPN ticket created",
          });

          return res.json({
            reply:
`VPN support ticket created successfully.

Ticket ID: ${ticket.id}
Priority: ${ticket.priority}
Status: ${ticket.status}`,

            trace,
          });
        }

        // CONTINUE VPN FLOW

        if (
          lower.includes("vpn")
        ) {

          trace.push({
            step: "final_response",
            reply:
              "VPN troubleshooting steps provided",
          });

          return res.json({
            reply:
`I can help troubleshoot your VPN issue first.

Try these steps:
• Check internet connection
• Restart VPN client
• Verify VPN credentials
• Restart your system

If the issue still persists, reply:
"raise vpn ticket"`,

            trace,
          });
        }

        delete pendingRequests[
          employeeId
        ];
      }

      // ==============================
// SOFTWARE ACCESS FOLLOW UP
// ==============================

if (
  pendingRequests[
    employeeId
  ]?.type === "software"
) {

  trace.push({
    step: "pending_flow",
    type: "software_access",
  });

  // =====================================
  // STEP 1:
  // SOFTWARE NAME NOT PROVIDED YET
  // =====================================

  if (
    !pendingRequests[
      employeeId
    ].software
  ) {

    pendingRequests[
      employeeId
    ].software =
      message;

    trace.push({
      step:
        "software_captured",

      software:
        message,
    });

    return res.json({
      reply:
`You requested access for "${message}".

Please verify:
• Manager approval
• Role-based requirement

If access is still required, reply:
"raise access ticket"`,

      trace,
    });
  }

  // =====================================
  // STEP 2:
  // CREATE ACCESS TICKET
  // =====================================

  if (
    lower.includes("raise") &&
    lower.includes("access") &&
    lower.includes("ticket")
  ) {

    const software =
      pendingRequests[
        employeeId
      ].software;

    const ticket =
      createTicket({
        employeeId,

        type: "access",

        item: software,

        priority:
          detectPriority(message),
      });

    delete pendingRequests[
      employeeId
    ];

    trace.push({
      step:
        "tool_result",

      tool:
        "createTicket",

      result:
        ticket,
    });

    return res.json({
  reply:
`We have reviewed your request for access to ${ticket.item}.

As per your request, we have raised a ${ticket.priority}-priority ticket (${ticket.id}) to facilitate your software access.

Ticket Details:

• Ticket ID: ${ticket.id}
• Employee ID: ${employeeId}
• Ticket Type: Access Request
• Software: ${ticket.item}
• Priority: ${ticket.priority}
• Status: ${ticket.status}
• Created At: ${ticket.createdAt}

Our support team will review and process your request shortly.

You will receive updates regarding the ticket status soon.`,

  trace,
});
  }

  // =====================================
  // DEFAULT FOLLOW UP
  // =====================================

  return res.json({
    reply:
`Reply:
"raise access ticket"`,

    trace,
  });
}

      // ==============================
      // DIRECT VPN TICKET
      // ==============================

      if (
        lower.includes("raise") &&
        lower.includes("vpn") &&
        lower.includes("ticket")
      ) {

        const ticket =
  createVpnTicket(
    employeeId,
    detectPriority(message)
  );

        trace.push({
          step: "tool_result",
          tool: "createVpnTicket",
          result: ticket,
        });

        trace.push({
          step: "final_response",
          reply:
            "VPN ticket created directly",
        });

        return res.json({
          reply:
`Your VPN support request has been registered successfully.

Ticket Details:

• Ticket ID: ${ticket.id}
• Employee ID: ${employeeId}
• Issue Type: VPN Support
• Priority: ${ticket.priority}
• Status: ${ticket.status}
• Created At: ${ticket.createdAt}

Our IT support team will investigate the issue and contact you soon.`,

          trace,
        });
      }

      // ==============================
      // ROUTER PROMPT
      // ==============================

      const decisionPrompt = `
You are DeskMate AI router.

Your job:
Classify ONLY IT helpdesk operations.

Available tools:
1. resetVpn
2. checkEntitlement
3. getAllTickets
4. resetPassword
5. closeTickets
6. closeTicket

Return ONLY valid JSON.

Examples:

{"tool":"checkEntitlement","software":"Figma"}

{"tool":"getAllTickets"}

{"tool":"resetPassword"}

{"tool":"closeTickets"}

{"tool":"closeTicket","ticketId":"TCK1001"}

{"tool":"resetVpn"}

{"tool":"out_of_scope"}

IMPORTANT RULES:

Return "out_of_scope" for:
- greetings
- casual conversation
- "who are you"
- "what can you do"
- "how are you"
- date/time questions
- jokes
- general knowledge
- anything not related to IT helpdesk

ONLY use checkEntitlement when the user is asking:
- access to software
- permission to software
- install software
- unable to use software
- software request

Examples of checkEntitlement:
- "need access to figma"
- "give me photoshop access"
- "i cannot use jira"

Examples of out_of_scope:
- "hi"
- "hello"
- "who are you"
- "what can you do"
- "how are you"
- "what is AI"

Rules:
- software access => checkEntitlement
- software permission => checkEntitlement
- software request => checkEntitlement

- show open tickets => getAllTickets
- show my tickets => getAllTickets
- ticket status => getAllTickets

- close all tickets => closeTickets
- close ticket => closeTicket

- password reset => resetPassword
- forgot password => resetPassword

- vpn issue => resetVpn
- vpn not connecting => resetVpn
- vpn problem => resetVpn
`;

      const decisionText =
        await askLLM(
          decisionPrompt,
          message
        );

      trace.push({
        step:
          "llm_router_response",

        raw:
          decisionText,
      });

      let decision;

      try {

        const cleaned =
          decisionText
            .replace(
              /```json/g,
              ""
            )
            .replace(
              /```/g,
              ""
            )
            .trim();

        decision =
          JSON.parse(cleaned);

      } catch {

        return res.json({
          reply:
            "AI parsing error occurred.",

          trace,
        });
      }

      trace.push({
        step: "decision",
        decision,
      });

      // ==============================
      // OUT OF SCOPE
      // ==============================

      if (
        decision.tool ===
        "out_of_scope"
      ) {

        trace.push({
          step: "out_of_scope",
        });

        return res.json({
          reply:
            "I can help with VPN, password reset, software access, and ticket management.",

          trace,
        });
      }

      // ==============================
      // SOFTWARE ACCESS
      // ==============================

      if (
        decision.tool ===
        "checkEntitlement"
      ) {

        if (
          !decision.software
        ) {

          return res.json({
            reply:
              "Which software would you like access to?",

            trace,
          });
        }

        const entitlement =
          checkEntitlement(
            employeeId,
            decision.software
          );

        trace.push({
          step: "tool_result",
          tool: "checkEntitlement",
          result: entitlement,
        });

        // ALREADY ENTITLED

        if (
          entitlement.entitled
        ) {

          return res.json({
            reply:
`You already have access to ${decision.software}.`,

            trace,
          });
        }

        // STORE PENDING SOFTWARE FLOW

        pendingRequests[
  employeeId
] = {
  type: "software",

  software:
    decision.software || null,
};

        trace.push({
          step: "final_response",
          reply:
            "Access verification requested",
        });

        return res.json({
          reply:
`You currently do not have access to ${decision.software}.

Before raising a ticket, please verify:
• Manager approval
• Correct employee account
• Role-based access requirement

If access is still required, reply:
"raise access ticket"`,

          trace,
        });
      }

      // ==============================
      // GET ALL TICKETS
      // ==============================

      if (
        decision.tool ===
        "getAllTickets"
      ) {

        const tickets =
          getAllTickets(
            employeeId
          );

        trace.push({
          step: "tool_result",
          tool: "getAllTickets",
          result: tickets,
        });

        if (
          tickets.length === 0
        ) {

          return res.json({
            reply:
              "No open tickets found.",

            trace,
          });
        }

        const formatted =
          tickets
            .map(
              (t) =>
`• ${t.id}
  Item: ${t.item}
  Priority: ${t.priority}
  Status: ${t.status}`
            )
            .join("\n\n");

        trace.push({
          step: "final_response",
          reply:
            "Open tickets returned",
        });

        return res.json({
          reply:
`Open Tickets:

${formatted}`,

          trace,
        });
      }

      // ==============================
      // CLOSE ALL TICKETS
      // ==============================

      if (
        decision.tool ===
        "closeTickets"
      ) {

        const result =
          closeTickets(
            employeeId
          );

        trace.push({
          step: "tool_result",
          tool: "closeTickets",
          result,
        });

        return res.json({
          reply:
            "All open tickets have been closed successfully.",

          trace,
        });
      }

      // ==============================
      // CLOSE SINGLE TICKET
      // ==============================

      if (
        decision.tool ===
        "closeTicket"
      ) {

        const ticketMatch =
          message.match(
            /TCK\d+/i
          );

        if (!ticketMatch) {

          return res.json({
            reply:
              "Please provide a valid ticket ID.",

            trace,
          });
        }

        const result =
          closeTicket(
            ticketMatch[0]
          );

        trace.push({
          step: "tool_result",
          tool: "closeTicket",
          result,
        });

        if (!result.ok) {

          return res.json({
            reply:
              "Ticket not found.",

            trace,
          });
        }

        return res.json({
          reply:
`Ticket ${result.ticket.id} has been closed successfully.`,

          trace,
        });
      }

      // ==============================
      // PASSWORD RESET
      // ==============================

      if (
        decision.tool ===
        "resetPassword"
      ) {

        const result =
          resetPassword(
            employeeId
          );

        trace.push({
          step: "tool_result",
          tool: "resetPassword",
          result,
        });

        return res.json({
          reply:
`Password reset link has been sent to your registered email.

Try these steps if you do not receive it:
• Refresh your email address
• Check spam/junk folder
• Verify your email address
• If you did not receive the email send the request again`,

          trace,
        });
      }

      // ==============================
      // RESET VPN
      // ==============================

      if (
        decision.tool ===
        "resetVpn"
      ) {

        const vpnReset =
          resetVpn(employeeId);

        trace.push({
          step: "tool_result",
          tool: "resetVpn",
          result: vpnReset,
        });

        pendingRequests[
          employeeId
        ] = {
          type: "vpn",
        };

        return res.json({
          reply:
`Your VPN has been reset.

Try these troubleshooting steps:
• Check internet connection
• Restart VPN client
• Verify VPN credentials
• Restart your system

If the issue still persists, reply:
"raise vpn ticket"`,

          trace,
        });
      }

      // ==============================
// ==============================
      // FALLBACK
      // ==============================

      return res.json({
        reply:
          "I cannot help with that but I can help with VPN, password reset, software access, and ticket management.",

        trace,
      });

    } catch (err) {

      console.log(err);

      return res.status(500).json({
        reply:
          "Server error occurred.",
      });
    }
  }
);

app.listen(3001, () => {

  console.log(
    "Server running on port 3001"
  );
});