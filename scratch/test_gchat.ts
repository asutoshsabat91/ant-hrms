import { sendGoogleChatNotification } from "../lib/googleChat";

async function main() {
  console.log("=== Testing Google Chat Webhook Integration ===");
  const message = "🚀 *AntBox HRMS Google Chat Integration Active!*\nNotifications for Leave Applications, Onboarding, Regularizations & HR announcements will now post directly to this channel.";
  const res = await sendGoogleChatNotification(message);
  console.log("Response:", res);
}

main().catch(console.error);
