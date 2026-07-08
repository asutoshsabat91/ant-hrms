export async function triggerN8nWebhook(urlKey: string, payload: Record<string, unknown>) {
  const webhookUrl = process.env[urlKey];
  if (!webhookUrl) {
    console.warn(`[N8N] Webhook URL environment variable ${urlKey} not found.`);
    return;
  }

  try {
    // Fire asynchronously in background
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch((err) => {
      console.error(`[N8N] Failed to fire webhook for ${urlKey}:`, err);
    });
  } catch (err) {
    console.error(`[N8N] Error triggering webhook for ${urlKey}:`, err);
  }
}
