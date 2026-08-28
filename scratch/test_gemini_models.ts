import { GoogleGenerativeAI } from "@google/generative-ai";

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log("API Key present:", !!apiKey, "Length:", apiKey?.length);
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-pro"
  ];

  for (const mName of modelsToTest) {
    try {
      console.log(`Testing model: ${mName}...`);
      const model = genAI.getGenerativeModel({ model: mName });
      const res = await model.generateContent("Hello Chachi!");
      console.log(`SUCCESS for ${mName}! Response:`, res.response.text());
      break;
    } catch (err: any) {
      console.error(`FAILED for ${mName}:`, err?.message || err);
    }
  }
}

testModels();
