import { google } from "googleapis";

export async function createWorkspaceUser(
  email: string,
  tempPassword: string,
  firstName: string,
  lastName: string
) {
  try {
    const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (!adminEmail || !clientEmail || !privateKey) {
      console.warn(
        `[Google Workspace] Missing configuration (GOOGLE_WORKSPACE_ADMIN_EMAIL, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Simulating user creation for: ${email}`
      );
      return { success: true, simulated: true };
    }

    // Initialize JWT auth client with Domain-Wide Delegation using JWTOptions object
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/admin.directory.user"],
      subject: adminEmail,
    });

    const admin = google.admin({ version: "directory_v1", auth });

    const response = await admin.users.insert({
      requestBody: {
        primaryEmail: email,
        name: {
          givenName: firstName,
          familyName: lastName,
        },
        password: tempPassword,
        changePasswordAtNextLogin: true,
      },
    });

    console.log(`[Google Workspace] Successfully created corporate user: ${email}`);
    return { success: true, user: response.data };
  } catch (error) {
    console.error(`[Google Workspace] Failed to create user account: ${email}`, error);
    // Return mock success with error status to prevent blocking database transaction commit
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
