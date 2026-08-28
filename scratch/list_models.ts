async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("No API Key!");
    return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log("Available models:", JSON.stringify(data, null, 2));
}

listAllModels();
