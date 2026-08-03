import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error("Missing Google Sheets credentials in environment variables.");
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

  // 1. Get spreadsheet metadata to locate "Employees" sheetId
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const empSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === "Employees"
  );

  if (!empSheet || empSheet.properties?.sheetId === undefined) {
    console.error('Sheet "Employees" not found!');
    return;
  }

  const sheetId = empSheet.properties.sheetId;

  // 2. Fetch row 1 headers to find exact column index for "Employment Type"
  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Employees!1:1",
  });

  const headers: string[] = (headerRes.data.values?.[0] || []).map((h) =>
    String(h).trim()
  );
  console.log("Headers found on Employees sheet:", headers);

  let targetColIndex = headers.findIndex(
    (h) => h.toLowerCase().includes("employment")
  );

  if (targetColIndex === -1) {
    console.log("Header containing 'employment' not found, defaulting to Column index 18 (S) or 19 (T)...");
    targetColIndex = 18; // Default Column S (index 18) or T (index 19)
  }

  console.log(`Targeting Column Index ${targetColIndex} (Letter ${String.fromCharCode(65 + targetColIndex)}) for Employment Type dropdown`);

  // 3. Set Data Validation rule for FULL_TIME and INTERN
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId,
              startRowIndex: 1, // Row 2 onwards (0-indexed)
              endRowIndex: 1000,
              startColumnIndex: targetColIndex,
              endColumnIndex: targetColIndex + 1,
            },
            rule: {
              condition: {
                type: "ONE_OF_LIST",
                values: [
                  { userEnteredValue: "FULL_TIME" },
                  { userEnteredValue: "INTERN" },
                ],
              },
              showCustomUi: true,
              strict: true, // Show warning / reject input if not in list
            },
          },
        },
      ],
    },
  });

  console.log("SUCCESS: Applied data validation dropdown ('FULL_TIME', 'INTERN') to Employees sheet!");
}

main().catch((err) => console.error("Error executing script:", err));
