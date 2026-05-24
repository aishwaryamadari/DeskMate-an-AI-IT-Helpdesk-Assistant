import { useState } from "react";
import axios from "axios";
import "./index.css";

export default function App() {

  const [employeeId, setEmployeeId] =
    useState("EMP101");

  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState([
      {
        role: "assistant",
        content:
          "Hi, I’m DeskMate. Ask me about password reset, VPN, software access, or ticket status.",
      },
    ]);

  const [loading, setLoading] =
    useState(false);

  const [trace, setTrace] =
    useState([]);

  const [openTickets, setOpenTickets] =
    useState([]);

  // ============================
  // SEND MESSAGE
  // ============================

  const sendMessage = async () => {

    if (!input.trim()) return;

    const userMessage = input.trim();

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: userMessage,
      },
    ]);

    setInput("");
    setLoading(true);

    try {

      const response =
        await axios.post(
          "http://localhost:3001/api/chat",
          {
            employeeId,
            message: userMessage,
          }
        );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            response.data.reply,
        },
      ]);

      setTrace(
        response.data.trace || []
      );

    } catch (err) {

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong.",
        },
      ]);
      console.log(err);
    }

    setLoading(false);
  };

  // ============================
  // ENTER KEY
  // ============================

  const onKeyDown = (e) => {

    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {

      e.preventDefault();
      sendMessage();
    }
  };

  // ============================
  // SHOW OPEN TICKETS
  // ============================

  const fetchOpenTickets =
  async () => {

    try {

      const response =
        await axios.post(
          "http://localhost:3001/api/chat",
          {
            employeeId,
            message:
              "show open tickets",
          }
        );

      const trace =
        response.data.trace || [];

      const ticketData =
        trace.find(
          (item) =>
            item.step ===
              "tool_result" &&

            item.tool ===
              "getAllTickets"
        );

      if (
        ticketData &&
        Array.isArray(
          ticketData.result
        )
      ) {

        setOpenTickets(
          ticketData.result
        );

      } else {

        setOpenTickets([]);
      }

    } catch (err) {

      console.log(err);
    }
  };
  // ============================
  // CLOSE SINGLE TICKET
  // ============================

  const closeTicket =
    async (ticketId) => {

      try {

        await axios.post(
          "http://localhost:3001/api/chat",
          {
            employeeId,
            message:
              `close ticket ${ticketId}`,
          }
        );

        fetchOpenTickets();

      } catch (err) {
        console.log(err);
      }
    };

  // ============================
  // CLOSE ALL TICKETS
  // ============================

  const closeAllTickets =
    async () => {

      try {

        await axios.post(
          "http://localhost:3001/api/chat",
          {
            employeeId,
            message:
              "close all tickets",
          }
        );

        setOpenTickets([]);

      } catch (err) {
        console.log(err);
      }
    };

  return (

    <div className="app-shell">

      {/* CHAT SECTION */}

      <div className="chat-card">

        <h1>DeskMate</h1>

        <p className="subtitle">
          AI helpdesk assistant POC
        </p>

        <div className="employee-row">

          <label>
            Employee ID
          </label>

          <input
            value={employeeId}
            onChange={(e) =>
              setEmployeeId(
                e.target.value
              )
            }
          />
        </div>

        <div className="chat-window">

          {messages.map(
            (msg, index) => (

              <div
  key={index}
  className={`bubble ${msg.role}`}
  style={{
    whiteSpace: "pre-line",
  }}
>
  {msg.content}
</div>
            )
          )}

          {loading && (
            <div className="bubble assistant">
              Thinking...
            </div>
          )}
        </div>

        <div className="input-row">

          <textarea
            rows={3}
            value={input}
            onChange={(e) =>
              setInput(
                e.target.value
              )
            }
            onKeyDown={onKeyDown}
            placeholder="Ask something..."
          />

          <button
            onClick={sendMessage}
          >
            Send
          </button>
        </div>

        <details className="trace-box">

          <summary>
            Execution trace
          </summary>

          <pre>
            {JSON.stringify(
              trace,
              null,
              2
            )}
          </pre>
        </details>
      </div>

      {/* RIGHT SIDEBAR */}

      <div className="ticket-sidebar">

        <h2>Open Tickets</h2>

        <div className="sidebar-actions">

          <button
            onClick={
              fetchOpenTickets
            }
          >
            Show Open Tickets
          </button>

          <button
            className="danger"
            onClick={
              closeAllTickets
            }
          >
            Close All Tickets
          </button>
        </div>

        {openTickets.length === 0 ? (

          <p className="empty-text">
            No open tickets
          </p>

        ) : (

          openTickets.map(
            (ticket) => (

              <div
                key={ticket.id}
                className="ticket-card"
              >

                <div>

                  <h3>
                    {ticket.id}
                  </h3>

                  <p>
                    {ticket.item}
                  </p>

                  <p>
                    Priority:
                    {" "}
                    {ticket.priority}
                  </p>

                  <p>
                    Status:
                    {" "}
                    {ticket.status}
                  </p>
                </div>

                <button
                  className="close-btn"
                  onClick={() =>
                    closeTicket(
                      ticket.id
                    )
                  }
                >
                  Close
                </button>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}