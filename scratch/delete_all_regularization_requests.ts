import { fetch } from 'undici';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const neonConnStr = process.env.DATABASE_URL || "";

  console.log("Deleting all records from RegularizationRequest...");

  const res = await fetch("https://ep-muddy-haze-athkvly7.c-9.us-east-1.aws.neon.tech/sql", {
    method: "POST",
    headers: {
      "Neon-Connection-String": neonConnStr,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: 'DELETE FROM "RegularizationRequest";'
    })
  });

  const data = await res.json();
  console.log("Deletion result:", JSON.stringify(data));
}

main().catch(err => console.error("Error deleting regularization requests:", err));
