import { exportDbToGoogleSheetsOnly } from "../lib/googleSheets";

async function run() {
  console.log("Triggering exportDbToGoogleSheetsOnly()...");
  const result = await exportDbToGoogleSheetsOnly();
  console.log("Result:", result);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Export Error:", err);
    process.exit(1);
  });
