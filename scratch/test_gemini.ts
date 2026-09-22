import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  console.log("API Key present:", !!apiKey);
  if (!apiKey) return;

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTest = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-3.6-flash"];

  for (const mName of modelsToTest) {
    try {
      console.log("Testing model:", mName);
      const model = genAI.getGenerativeModel({ model: mName });
      const result = await model.generateContent("Namaste!");
      console.log(`Success for ${mName}! Response:`, result.response.text());
      break;
    } catch (err: unknown) {
      console.error(`Failed for ${mName}:`, (err as Error)?.message);
    }
  }
}

main().catch(console.error);
