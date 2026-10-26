import { OAuth2Client } from "google-auth-library";

/**
 * Verifies the Bearer token Google Chat attaches to HTTP-endpoint app requests.
 *
 * Configure GOOGLE_CHAT_AUDIENCE to match the "Authentication Audience" chosen in
 * the Google Chat API configuration:
 *   - Project number (digits)  -> JWT signed by chat@system.gserviceaccount.com
 *   - HTTP endpoint URL        -> Google OIDC ID token for chat@system.gserviceaccount.com
 *
 * Fails closed: returns false if the audience is not configured or the token is invalid.
 * See https://developers.google.com/workspace/chat/verify-requests-from-chat
 */
const CHAT_ISSUER = "chat@system.gserviceaccount.com";
const CHAT_CERTS_URL =
  "https://www.googleapis.com/service_accounts/v1/metadata/x509/chat@system.gserviceaccount.com";

const client = new OAuth2Client();

export async function verifyGoogleChatRequest(req: Request): Promise<boolean> {
  const audience = process.env.GOOGLE_CHAT_AUDIENCE?.trim();
  if (!audience) return false;

  const header = req.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return false;

  try {
    if (/^\d+$/.test(audience)) {
      // Audience = project number: self-signed JWT from the Chat service account.
      const res = await fetch(CHAT_CERTS_URL, { next: { revalidate: 3600 } });
      if (!res.ok) return false;
      const certs = (await res.json()) as Record<string, string>;
      const ticket = await client.verifySignedJwtWithCertsAsync(token, certs, audience, [CHAT_ISSUER]);
      return ticket.getPayload()?.iss === CHAT_ISSUER;
    }

    // Audience = endpoint URL: Google-signed OIDC ID token.
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    return payload?.email === CHAT_ISSUER && payload.email_verified === true;
  } catch {
    return false;
  }
}
