const employees = {

  EMP101: {
    name: "Aishwarya Madari",

    department: "Design",

    entitlements: [
      "Slack",
      "Figma",
      "Canva",
    ],

    vpnStatus: "active",
  },

  EMP102: {
    name: "Vijitha",

    department: "Development",

    entitlements: [
      "Jira",
      "GitHub",
      "Postman",
    ],

    vpnStatus: "inactive",
  },

  EMP103: {
    name: "Jejo",

    department: "HR",

    entitlements: [
      "Slack",
      "Workday",
      "Zoom",
    ],

    vpnStatus: "active",
  },

  EMP104: {
    name: "Samay Raina",

    department: "Finance",

    entitlements: [
      "Excel",
      "SAP",
      "Power BI",
    ],

    vpnStatus: "inactive",
  },

  EMP105: {
    name: "Meloni",

    department: "Marketing",

    entitlements: [
      "Canva",
      "Figma",
      "Google Analytics",
    ],

    vpnStatus: "active",
  },
};

const tickets = [

  {
    id: "TCK1001",

    employeeId: "EMP101",

    type: "access",

    item: "Adobe Creative Suite",

    priority: "high",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },

  {
    id: "TCK1002",

    employeeId: "EMP101",

    type: "vpn",

    item: "VPN Access",

    priority: "medium",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },

  {
    id: "TCK1003",

    employeeId: "EMP102",

    type: "access",

    item: "Docker Desktop",

    priority: "high",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },

  {
    id: "TCK1004",

    employeeId: "EMP103",

    type: "password",

    item: "Password Reset",

    priority: "low",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },

  {
    id: "TCK1005",

    employeeId: "EMP104",

    type: "vpn",

    item: "VPN Access",

    priority: "high",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },

  {
    id: "TCK1006",

    employeeId: "EMP105",

    type: "access",

    item: "Adobe Photoshop",

    priority: "medium",

    status: "open",

    createdAt:
      new Date().toISOString(),
  },
];
// ======================================
// GET EMPLOYEE
// ======================================

export function getEmployee(
  employeeId
) {

  return (
    employees[employeeId] ||
    null
  );
}

// ======================================
// CHECK ENTITLEMENT
// ======================================

export function checkEntitlement(
  employeeId,
  software
) {

  const employee =
    employees[employeeId];

  if (!employee) {

    return {
      found: false,
      entitled: false,
    };
  }

  const entitled =
    employee.entitlements.some(
      (item) =>
        item.toLowerCase() ===
        software.toLowerCase()
    );

  return {
    found: true,
    entitled,
  };
}

// ======================================
// CREATE TICKET
// ======================================

export function createTicket({
  employeeId,
  type,
  item,
  priority = "medium",
}) {

  const ticket = {
    id: `TCK${
      1000 + tickets.length + 1
    }`,

    employeeId,

    type,

    item,

    priority,

    status: "open",

    createdAt:
      new Date().toISOString(),
  };

  tickets.push(ticket);

  return ticket;
}

// ======================================
// GET ALL OPEN TICKETS
// ======================================

export function getAllTickets(
  employeeId
) {

  return tickets.filter(
    (ticket) =>
      ticket.employeeId ===
        employeeId &&

      ticket.status ===
        "open"
  );
}

// ======================================
// CLOSE SINGLE TICKET
// ======================================

export function closeTicket(
  ticketId
) {

  const ticket =
    tickets.find(
      (t) =>
        t.id.toLowerCase() ===
        ticketId.toLowerCase()
    );

  if (!ticket) {

    return {
      ok: false,

      message:
        "Ticket not found",
    };
  }

  ticket.status =
    "closed";

  return {
    ok: true,
    ticket,
  };
}

// ======================================
// CLOSE ALL TICKETS
// ======================================

export function closeTickets(
  employeeId
) {

  const employeeTickets =
    tickets.filter(
      (ticket) =>
        ticket.employeeId ===
          employeeId &&

        ticket.status ===
          "open"
    );

  employeeTickets.forEach(
    (ticket) => {
      ticket.status =
        "closed";
    }
  );

  return employeeTickets;
}

// ======================================
// RESET VPN
// ======================================

export function resetVpn(
  employeeId
) {

  const emp =
    getEmployee(employeeId);

  if (!emp) {

    return {
      ok: false,

      message:
        "Employee not found",
    };
  }

  emp.vpnStatus =
    "active";

  return {
    ok: true,

    message:
      "VPN reset completed",
    };
}

// ======================================
// CREATE VPN TICKET
// ======================================

export function createVpnTicket(
  employeeId,
  priority = "medium"
) {

  return createTicket({
    employeeId,

    type: "vpn",

    item: "VPN Access",

    priority,
  });
}

// ======================================
// PASSWORD RESET
// ======================================

export function resetPassword(
  employeeId
) {

  const emp =
    getEmployee(employeeId);

  if (!emp) {

    return {
      ok: false,

      message:
        "Employee not found",
    };
  }

  return {
    ok: true,

    message:
      "Password reset link sent",
    };
}