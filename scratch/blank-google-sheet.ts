import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

function getSheetsClient() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.error("Missing Google Sheets credentials in environment variables.");
    return null;
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

  return {
    sheets: google.sheets({ version: "v4", auth }),
    spreadsheetId,
  };
}

async function main() {
  const client = getSheetsClient();
  if (!client) return;

  const { sheets, spreadsheetId } = client;
  console.log(`Blanking out Google Sheet (ID: ${spreadsheetId}) to header titles only...`);

  const headers = {
    Employees: [
      [
        "Employee ID", "First Name", "Last Name", "Official Email", "Personal Email", "Phone",
        "Date of Birth", "Gender", "Blood Group", "Permanent Address", "City", "State", "Pincode",
        "Emergency Contact Name", "Emergency Contact Phone", "Job Role", "Department", "Deployed Company",
        "Employment Type", "Status", "Joining Date", "CTC", "Basic Salary", "HRA",
        "Special Allowance", "PF", "Professional Tax", "Bank Name", "Bank Account Number",
        "IFSC Code", "PAN", "UAN", "Password (Bcrypt Hash)"
      ]
    ],
    Departments: [
      ["Department Code", "Department Name", "Active Headcount"]
    ],
    Clients: [
      ["Client / Deployed Company", "Active Headcount"]
    ],
    "Leave Requests": [
      ["Employee ID", "Employee Name", "Leave Type", "Start Date", "End Date", "Days", "Reason", "Status"]
    ],
    Reimbursements: [
      ["Employee ID", "Employee Name", "Title", "Category", "Amount", "Currency", "Date", "Status"]
    ],
    Separations: [
      ["Employee ID", "Employee Name", "Status", "Notice Days", "Reason", "Initiated At"]
    ]
  };

  for (const [sheetName, headerValues] of Object.entries(headers)) {
    try {
      // Clear all range A:Z
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      });

      // Write header titles back to row 1
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: "RAW",
        requestBody: { values: headerValues },
      });

      console.log(`Sheet "${sheetName}" cleared & set to title headers only.`);
    } catch (err) {
      console.error(`Error processing sheet "${sheetName}":`, err instanceof Error ? err.message : String(err));
    }
  }

  // Set Data Validation rule on Employees sheet for Job Role column (Column P, index 15)
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const empSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === "Employees");
    if (empSheet?.properties?.sheetId !== undefined) {
      const sheetId = empSheet.properties.sheetId;
      const jobRoles = [
        "CEO",
        "Chief Of Staff (COS)",
        "Founder's Office HR",
        "Founder'S Office",
        "GTM Growth Executive",
        "GTM Marketing and Operations",
        "Strategies and Operations Associate",
        "Implementation Consultant",
        "Integration Consultant",
        "Customer Support",
        "L&D Knowledge Base",
        "SDE"
      ];

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              setDataValidation: {
                range: {
                  sheetId,
                  startRowIndex: 1, // Row 2 downwards
                  endRowIndex: 1000,
                  startColumnIndex: 15, // Column P (Job Role)
                  endColumnIndex: 16
                },
                rule: {
                  condition: {
                    type: "ONE_OF_LIST",
                    values: jobRoles.map(role => ({ userEnteredValue: role }))
                  },
                  showCustomUi: true,
                  strict: false
                }
              }
            }
          ]
        }
      });
      console.log("Data Validation dropdown for 12 Job Roles applied to Employees sheet Column P!");
    }
  } catch (valErr) {
    console.error("Failed to apply Data Validation dropdown:", valErr);
  }

  console.log("\nAll sheets blanked out! Ready for Rohit or Chandrita to dump clean data.");
}

main();
