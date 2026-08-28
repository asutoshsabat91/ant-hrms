import { sendChachiAnnouncementToGoogleChat } from "../lib/googleChat";

async function main() {
  console.log("=== Posting AntBox Chachi to Google Chat ===");
  const res = await sendChachiAnnouncementToGoogleChat();
  console.log("Google Chat Response:", res);
}

main().catch(console.error);
