import { GoogleGenerativeAI } from "@google/generative-ai";

async function test35() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return;
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"];

  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const start = Date.now();
      const res = await model.generateContent("Namaste Chachi!");
      console.log(`SUCCESS for ${m} in ${Date.now() - start}ms:`, res.response.text().slice(0, 80));
    } catch (e: any) {
      console.error(`FAILED for ${m}:`, e?.message);
    }
  }
}

test35();
