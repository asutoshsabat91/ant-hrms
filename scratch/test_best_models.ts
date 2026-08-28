import { GoogleGenerativeAI } from "@google/generative-ai";

async function testBest() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return;
  const genAI = new GoogleGenerativeAI(apiKey);
  const models = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.6-flash"];

  for (const m of models) {
    try {
      console.log(`Testing ${m}...`);
      const model = genAI.getGenerativeModel({ model: m });
      const res = await model.generateContent("Hello AntBox Chachi! How are you?");
      console.log(`SUCCESS for ${m}:`, res.response.text().slice(0, 100));
      break;
    } catch (e: any) {
      console.error(`FAILED for ${m}:`, e?.message);
    }
  }
}

testBest();
