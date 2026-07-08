import { google } from "googleapis";

export async function createOfferLetterFromTemplate(candidate: {
  candidateName: string;
  email: string;
  designation: string;
  salary: number;
  joiningDate: string;
}) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const templateDocId = process.env.GOOGLE_DOCS_OFFER_TEMPLATE_ID;
  const outputFolderId = process.env.GOOGLE_DRIVE_OFFER_FOLDER_ID;

  if (!clientEmail || !privateKey || !templateDocId) {
    console.warn(
      "[Google Docs] Missing service account credentials or template ID. Simulating PDF offer letter generation."
    );
    return { success: true, simulated: true, pdfBuffer: Buffer.from("Simulated PDF Content") };
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: [
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive",
    ],
  });

  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  try {
    // 1. Copy the Google Doc template
    const copyResponse = await drive.files.copy({
      fileId: templateDocId,
      requestBody: {
        name: `Offer Letter - ${candidate.candidateName}`,
        parents: outputFolderId ? [outputFolderId] : undefined,
      },
    });

    const newDocId = copyResponse.data.id;
    if (!newDocId) throw new Error("Failed to duplicate template document.");

    // 2. Perform Batch Update to swap placeholder text
    await docs.documents.batchUpdate({
      documentId: newDocId,
      requestBody: {
        requests: [
          {
            replaceAllText: {
              containsText: { text: "{{candidateName}}", matchCase: true },
              replaceText: candidate.candidateName,
            },
          },
          {
            replaceAllText: {
              containsText: { text: "{{designation}}", matchCase: true },
              replaceText: candidate.designation,
            },
          },
          {
            replaceAllText: {
              containsText: { text: "{{salary}}", matchCase: true },
              replaceText: `₹${candidate.salary.toLocaleString("en-IN")} per annum`,
            },
          },
          {
            replaceAllText: {
              containsText: { text: "{{joiningDate}}", matchCase: true },
              replaceText: new Date(candidate.joiningDate).toLocaleDateString(),
            },
          },
        ],
      },
    });

    // 3. Export generated Google Doc as a PDF file
    const pdfResponse = await drive.files.export(
      {
        fileId: newDocId,
        mimeType: "application/pdf",
      },
      { responseType: "arraybuffer" }
    );

    const pdfBuffer = Buffer.from(pdfResponse.data as ArrayBuffer);

    console.log(`[Google Docs] Generated offer letter PDF for candidate: ${candidate.candidateName}`);
    return { success: true, docId: newDocId, pdfBuffer };
  } catch (error) {
    console.error("[Google Docs] Failed to generate offer letter document:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
