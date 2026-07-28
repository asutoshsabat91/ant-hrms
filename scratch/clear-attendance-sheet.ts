import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) return null;

  const cleanKey = privateKey.replace(/\\n/g, "\n").replace(/^['"]|['"]$/g, "").trim();
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: cleanKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

async function main() {
  const client = getSheetsClient();
  if (!client) {
    console.error("Missing Google Sheets credentials.");
    return;
  }

  const { sheets, spreadsheetId } = client;
  console.log(`Clearing all data in Attendance Logs for Google Sheet (ID: ${spreadsheetId})...`);

  const attendanceTabs = [
    {
      name: "Attendance Logs",
      headers: [["Date", "Employee ID", "Employee Name", "Status", "First Punch", "Latest Punch", "Clock Cycles", "Total Hours"]],
    },
    {
      name: "Biometric Import",
      headers: [["Employee ID", "Employee Name", "Date", "Check In", "Check Out", "Punches"]],
    },
    {
      name: "Attendance",
      headers: [["Date", "Employee ID", "Employee Name", "Punch Type", "Time", "Location"]],
    },
  ];

  for (const tab of attendanceTabs) {
    try {
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${tab.name}!A:Z`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab.name}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: tab.headers },
      });
      console.log(`Cleared tab "${tab.name}" and set to header row only.`);
    } catch (err) {
      console.log(`Tab "${tab.name}" not found or optional.`);
    }
  }

  console.log("\nAttendance Logs cleared successfully! Only headers remain.");
}

main();
