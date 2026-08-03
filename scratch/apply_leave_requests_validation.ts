import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error("Missing Google Sheets credentials.");
    return;
  }

  const cleanKey = privateKey
    .replace(/\\n/g, "\n")
    .replace(/^['"]|['"]$/g, "")
    .trim();

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: cleanKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  console.log(`Connecting to Google Sheet (ID: ${spreadsheetId})...`);

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const leaveSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Leave Requests"
  );

  if (!leaveSheet || leaveSheet.properties?.sheetId === undefined) {
    console.error('Sheet "Leave Requests" not found!');
    return;
  }

  const sheetId = leaveSheet.properties.sheetId;

  // Set Data Validation rule on Column H (Status) for rows 2 to 2000
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId,
              startRowIndex: 1, // Row 2 onwards (0-indexed)
              endRowIndex: 2000,
              startColumnIndex: 7, // Column H (Status)
              endColumnIndex: 8,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "PENDING" },
                  { userEnteredValue: "APPROVED" },
                  { userEnteredValue: "REJECTED" },
                  { userEnteredValue: "CANCELLED" },
                ],
              },
              showCustomUi: true,
              strict: true,
            },
          },
        },
      ],
    },
  });

  console.log("SUCCESS: Applied Status Data Validation dropdown (PENDING, APPROVED, REJECTED, CANCELLED) to Leave Requests sheet Column H (Rows 2 to 2000)!");
}

main().catch((err) => console.error("Error running script:", err));
