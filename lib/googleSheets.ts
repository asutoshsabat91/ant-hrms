import { google } from "googleapis";

export async function appendEmployeeToSheet(employee: {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  deployedCompany?: string | null;
  joiningDate: Date | string;
  status: string;
}) {
  try {
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!spreadsheetId || !clientEmail || !privateKey) {
      console.warn(
        "[Google Sheets] Missing credentials/config (GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Sync skipped."
      );
      return { success: true, simulated: true };
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const values = [
      [
        employee.employeeId,
        `${employee.firstName} ${employee.lastName}`,
        employee.email,
        employee.designation,
        employee.deployedCompany || "AntBox",
        new Date(employee.joiningDate).toLocaleDateString(),
        employee.status,
      ],
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Sheet1!A:G",
      valueInputOption: "RAW",
      requestBody: { values },
    });

    console.log(`[Google Sheets] Successfully appended new hire: ${employee.email}`);
    return { success: true };
  } catch (error) {
    console.error("[Google Sheets] Failed to append employee:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
