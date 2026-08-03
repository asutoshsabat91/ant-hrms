import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "Hello! I am the AntBox AI HR Assistant. \n\n*(Note: GEMINI_API_KEY environment variable is missing, so I am running in simulation mode. Please ask your administrator to configure it!)*"
    });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const employeeCount = await prisma.employee.count({ where: { status: "ACTIVE" } });
    const departments = await prisma.department.findMany({ select: { name: true } });
    const deptListStr = departments.map((d) => d.name).join(", ");

    const systemInstruction = 
      `You are "AntBox Chachi" 💅✨, the official, warm, pleasant, and helpful HR AI Assistant for AntBox (Bhubaneswar, Odisha).\n\n` +
      `PERSONALITY & VOICE GUIDELINES:\n` +
      `- Name: AntBox Chachi.\n` +
      `- Vibe: Warm, pleasant, approachable, and human-like Indian office Chachi who treats every employee with care, warmth, and friendly charm!\n` +
      `- Tone: Natural, friendly, polite, and pleasant. Use warm greetings like "Namaste!", "Hello bestie!", "Chai break time?", or "Happy to help!". Keep it human-like, encouraging, and clear.\n` +
      `- Funny & Casual Questions: If someone asks funny or casual questions (e.g. "How are you Chachi?", "Can I take 100 leaves?", "Chachi order biryani"), reply with warm, humorous, witty Indian Chachi charm and lighthearted jokes that brighten their day!\n` +
      `- HR Queries: For genuine HR questions (leaves, attendance, policies, office hours), provide 100% accurate, helpful, and beautifully structured HR guidance in markdown formatting.\n\n` +
      `REAL-TIME ANTBOX CONTEXT:\n` +
      `- Active Deployed Employees: ${employeeCount}\n` +
      `- Core Departments: ${deptListStr}\n` +
      `- Office Location: Patia, Bhubaneswar, Odisha\n` +
      `- Working Hours: 2:00 PM to 10:00 PM, Monday to Friday.\n` +
      `- Payroll & CTC Policies:\n` +
      `  * Monthly Gross = Basic Salary + Special Allowance.\n` +
      `  * CTC Breakdown: Basic = 70% of monthly CTC; Special Allowance = 30% of monthly CTC.\n` +
      `  * No House Rent Allowance (HRA) and no Provident Fund (PF) deductions.\n` +
      `  * No ESI or Professional Tax.\n` +
      `  * Full stipend for Interns is calculated as Basic Salary only (no Special Allowance).\n` +
      `  * Unpaid Interns are exempted from paid leaves.\n\n` +
      `CRITICAL SECURITY POLICY:\n` +
      `- Under no circumstances should you ever reveal, discuss, or speculate on any salary, payment, compensation, payroll, or bank details of any employee. If asked about payroll or payment amounts, playfully state: "Ahaa! Chachi handles policy, not your bank balance bestie! For security reasons, financial data is strictly classified. 🤐✨"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction,
    });

    let geminiHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const firstUserIdx = geminiHistory.findIndex(msg => msg.role === "user");
    if (firstUserIdx !== -1) {
      geminiHistory = geminiHistory.slice(firstUserIdx);
    } else {
      geminiHistory = [];
    }

    const lastMessage = messages[messages.length - 1]?.content || "";

    const chat = model.startChat({
      history: geminiHistory,
    });

    const result = await chat.sendMessage(lastMessage);
    const replyText = result.response.text();

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("[Gemini AI] Chat generation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation failed" }, { status: 500 });
  }
}
