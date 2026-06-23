import { google } from "googleapis";

export async function createGoogleCalendarEvent(eventData: {
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  allDay?: boolean;
}) {
  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    const adminEmail = process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;

    if (!clientEmail || !privateKey) {
      console.warn(
        "[Google Calendar] Missing service account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY). Calendar sync skipped."
      );
      return { success: true, simulated: true };
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
      subject: adminEmail || undefined,
    });

    const calendar = google.calendar({ version: "v3", auth });

    const start = new Date(eventData.startDate);
    const end = new Date(eventData.endDate);

    const eventRequestBody: {
      summary?: string;
      description?: string;
      start?: { date?: string; dateTime?: string };
      end?: { date?: string; dateTime?: string };
    } = {
      summary: eventData.title,
      description: eventData.description,
    };

    if (eventData.allDay) {
      // For all-day events, the end date in Google Calendar is exclusive.
      // So if start is 2026-06-23 and end is 2026-06-23, to cover that whole day end date must be 2026-06-24.
      const exclusiveEndDate = new Date(end);
      exclusiveEndDate.setDate(exclusiveEndDate.getDate() + 1);

      eventRequestBody.start = { date: start.toISOString().split("T")[0] };
      eventRequestBody.end = { date: exclusiveEndDate.toISOString().split("T")[0] };
    } else {
      eventRequestBody.start = { dateTime: start.toISOString() };
      eventRequestBody.end = { dateTime: end.toISOString() };
    }

    const response = await calendar.events.insert({
      calendarId,
      requestBody: eventRequestBody,
    });

    console.log(`[Google Calendar] Successfully created event: ${response.data.summary}`);
    return { success: true, eventId: response.data.id };
  } catch (error) {
    console.error("[Google Calendar] Failed to create event:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
