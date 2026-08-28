async function findValidChatModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  const valid = data.models
    ?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m: any) => m.name.replace("models/", ""));

  console.log("Valid generateContent models:", valid);
}

findValidChatModels();
