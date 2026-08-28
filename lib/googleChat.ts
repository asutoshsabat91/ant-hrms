export async function sendGoogleChatNotification(text: string) {
  const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[Google Chat] GOOGLE_CHAT_WEBHOOK_URL environment variable is not set. Chat notification skipped.");
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      throw new Error(`Google Chat webhook returned HTTP status ${res.status}`);
    }

    console.log("[Google Chat] Successfully posted announcement.");
    return { success: true };
  } catch (error) {
    console.error("[Google Chat] Failed to post notification:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function sendChachiAnnouncementToGoogleChat(customMessage?: string) {
  const text = customMessage || 
    `💅✨ *Namaste AntBox Team! AntBox Chachi is now live in this Google Chat Space!* 💅✨\n\n` +
    `Hello besties! I am *AntBox Chachi*, your friendly HR AI Companion! ☕\n\n` +
    `Need help with leaves, office policies, working hours, or attendance? Or just want a quick chai break conversation? Chachi is right here for you!\n\n` +
    `👉 *Visit AntBox HRMS to chat with Chachi anytime:* https://antbox-hrms-one.vercel.app`;

  return sendGoogleChatNotification(text);
}
