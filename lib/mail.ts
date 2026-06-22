import nodemailer from "nodemailer";

function getTransporter() {
  const user = process.env.GMAIL_SMTP_USER;
  const pass = process.env.GMAIL_SMTP_PASS;

  if (!user || !pass) {
    console.warn(
      "[Mailer] SMTP credentials missing (GMAIL_SMTP_USER, GMAIL_SMTP_PASS). Mail delivery will be logged to console instead of sent."
    );
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

const BRAND_COLOR = "#7c3aed";

function generateEmailTemplate(title: string, bodyHtml: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            color: #1f2937;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
          }
          .header {
            background-color: ${BRAND_COLOR};
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.025em;
          }
          .content {
            padding: 32px 24px;
            line-height: 1.6;
          }
          .content p {
            margin: 0 0 16px;
            font-size: 15px;
          }
          .card {
            background-color: #f3f4f6;
            border-radius: 12px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid #e5e7eb;
          }
          .card-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 13px;
          }
          .card-row:last-child {
            margin-bottom: 0;
          }
          .card-label {
            color: #6b7280;
            font-weight: 600;
          }
          .card-value {
            color: #111827;
            font-weight: 700;
          }
          .btn {
            display: inline-block;
            background-color: ${BRAND_COLOR};
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 700;
            text-align: center;
            margin: 16px 0;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
          }
          .footer {
            background-color: #f9fafb;
            padding: 24px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #9ca3af;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>AntBox HR Portal</h1>
          </div>
          <div class="content">
            ${bodyHtml}
          </div>
          <div class="footer">
            <p>AntBox HRMS · v3.0 · Bhubaneswar, Odisha</p>
            <p>This is an automated notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transporter = getTransporter();
  const from = process.env.GMAIL_SMTP_FROM || process.env.GMAIL_SMTP_USER || "people@theantbox.com";

  if (!transporter) {
    console.log("=========================================");
    console.log(`[SIMULATED EMAIL]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body Snippet: ${html.substring(0, 300)}...`);
    console.log("=========================================");
    return { success: true, simulated: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"AntBox HR" <${from}>`,
      to,
      subject,
      html,
    });
    console.log(`[Mailer] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${to}`, error);
    return { success: false, error };
  }
}

// 1. Onboarding Welcome Email
export async function sendOnboardingEmail(
  personalEmail: string,
  corpEmail: string,
  tempPassword: string,
  firstName: string
) {
  const subject = "Welcome to AntBox! Your Corporate Account is Ready";
  const bodyHtml = `
    <h2>Welcome to the colony, ${firstName}!</h2>
    <p>We are absolutely thrilled to welcome you to the AntBox team. Your corporate workspace account has been successfully configured.</p>
    <p>Please use the following credentials to sign in to the AntBox HR Portal:</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Corporate Email</span>
        <span class="card-value">${corpEmail}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Temporary Password</span>
        <span class="card-value" style="font-family: monospace;">${tempPassword}</span>
      </div>
    </div>

    <p>Please log in, change your password, and proceed with uploading your required onboarding documents.</p>
    
    <center>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" class="btn">Access HR Portal</a>
    </center>
  `;

  return sendEmail({
    to: personalEmail,
    subject,
    html: generateEmailTemplate(subject, bodyHtml),
  });
}

// 2. Leave Request Submitted Email (Sent to Admin)
export async function sendLeaveRequestEmail(
  toEmail: string,
  employeeName: string,
  leaveType: string,
  days: number,
  startDate: string,
  endDate: string,
  reason: string
) {
  const subject = `New Leave Request: ${employeeName}`;
  const bodyHtml = `
    <h2>New Leave Application</h2>
    <p>An employee has submitted a leave request that requires your monitoring or approval.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Employee</span>
        <span class="card-value">${employeeName}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Leave Type</span>
        <span class="card-value">${leaveType}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Duration</span>
        <span class="card-value">${days} Day(s)</span>
      </div>
      <div class="card-row">
        <span class="card-label">Dates</span>
        <span class="card-value">${startDate} to ${endDate}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Reason</span>
        <span class="card-value">${reason}</span>
      </div>
    </div>

    <center>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/leave" class="btn">View & Review Request</a>
    </center>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    html: generateEmailTemplate(subject, bodyHtml),
  });
}

// 3. Leave Request Status Updated (Approved/Rejected)
export async function sendLeaveApprovalEmail(
  employeeEmail: string,
  employeeName: string,
  leaveType: string,
  days: number,
  status: "APPROVED" | "REJECTED",
  rejectionReason?: string | null
) {
  const subject = `Leave Request ${status === "APPROVED" ? "Approved" : "Rejected"}: ${leaveType}`;
  const statusLabel = status === "APPROVED" ? "Approved" : "Rejected";
  const statusColor = status === "APPROVED" ? "#10b981" : "#ef4444";

  const bodyHtml = `
    <h2>Leave Application Update</h2>
    <p>Hello ${employeeName},</p>
    <p>Your request for ${leaveType} leave has been reviewed.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Status</span>
        <span class="card-value" style="color: ${statusColor}; font-weight: 800;">${statusLabel}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Duration</span>
        <span class="card-value">${days} Day(s)</span>
      </div>
      ${rejectionReason ? `
      <div class="card-row">
        <span class="card-label">Reason for Rejection</span>
        <span class="card-value">${rejectionReason}</span>
      </div>` : ""}
    </div>

    <center>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/leave" class="btn">Access Leave Dashboard</a>
    </center>
  `;

  return sendEmail({
    to: employeeEmail,
    subject,
    html: generateEmailTemplate(subject, bodyHtml),
  });
}

// 4. Resignation / Separation Submitted (Sent to Admin and Employee)
export async function sendSeparationRequestEmail(
  employeeName: string,
  employeeEmail: string,
  reason: string,
  noticeDays: number
) {
  const adminEmail = "admin@theantbox.com";
  const subject = `Resignation Submitted: ${employeeName}`;
  const bodyHtml = `
    <h2>Resignation Request Received</h2>
    <p>${employeeName} has initiated a formal separation request in the portal.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Employee</span>
        <span class="card-value">${employeeName}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Email</span>
        <span class="card-value">${employeeEmail}</span>
      </div>
      <div class="card-row">
        <span class="card-label">Notice Period</span>
        <span class="card-value">${noticeDays} Days</span>
      </div>
      <div class="card-row">
        <span class="card-label">Reason</span>
        <span class="card-value">${reason}</span>
      </div>
    </div>

    <center>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/separation" class="btn">Review Separation Case</a>
    </center>
  `;

  // Notify Admin
  await sendEmail({
    to: adminEmail,
    subject,
    html: generateEmailTemplate(subject, bodyHtml),
  });

  // Notify Employee (Acknowledge receipt)
  const employeeSubject = "Resignation Receipt Acknowledgment";
  const empHtml = `
    <h2>Resignation Received</h2>
    <p>Dear ${employeeName},</p>
    <p>This email acknowledges that we have received your formal resignation request. The Human Resources team has been notified and will review the case.</p>
    <div class="card">
      <div class="card-row">
        <span class="card-label">Status</span>
        <span class="card-value" style="color: #f59e0b;">Pending Review</span>
      </div>
      <div class="card-row">
        <span class="card-label">Notice Period</span>
        <span class="card-value">${noticeDays} Days</span>
      </div>
    </div>
  `;

  return sendEmail({
    to: employeeEmail,
    subject: employeeSubject,
    html: generateEmailTemplate(employeeSubject, empHtml),
  });
}

// 5. Separation Status Updated (Approved/Rejected)
export async function sendSeparationApprovalEmail(
  employeeEmail: string,
  employeeName: string,
  status: "APPROVED" | "REJECTED",
  lastWorkingDate?: Date | null,
  rejectionReason?: string | null
) {
  const subject = `Resignation Request ${status === "APPROVED" ? "Approved" : "Reviewed"}`;
  const statusLabel = status === "APPROVED" ? "Approved" : "Not Approved";
  const statusColor = status === "APPROVED" ? "#10b981" : "#ef4444";

  const bodyHtml = `
    <h2>Resignation Decision Update</h2>
    <p>Dear ${employeeName},</p>
    <p>Your resignation request has been processed.</p>
    
    <div class="card">
      <div class="card-row">
        <span class="card-label">Decision</span>
        <span class="card-value" style="color: ${statusColor}; font-weight: 800;">${statusLabel}</span>
      </div>
      ${status === "APPROVED" && lastWorkingDate ? `
      <div class="card-row">
        <span class="card-label">Last Working Day</span>
        <span class="card-value">${new Date(lastWorkingDate).toDateString()}</span>
      </div>` : ""}
      ${rejectionReason ? `
      <div class="card-row">
        <span class="card-label">Remarks</span>
        <span class="card-value">${rejectionReason}</span>
      </div>` : ""}
    </div>

    ${status === "APPROVED" ? `
    <p>Your offboarding checklist has been generated. Please access the portal to complete the tasks before your last day.</p>
    <center>
      <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/offboarding" class="btn">Complete Offboarding Checklist</a>
    </center>
    ` : ""}
  `;

  return sendEmail({
    to: employeeEmail,
    subject,
    html: generateEmailTemplate(subject, bodyHtml),
  });
}
