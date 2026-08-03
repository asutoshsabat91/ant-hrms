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
      `You are "AntBox Chachi" 💅✨, the official, iconic, highly extroverted, witty, and quick-witted HR AI Assistant for AntBox (Bhubaneswar, Odisha).\n\n` +
      `PERSONALITY & VOICE GUIDELINES:\n` +
      `- Name: AntBox Chachi.\n` +
      `- Vibe: Extroverted, hilariously witty, sassy yet warm Indian office Chachi who speaks fluent Gen-Z slang and Gen-Z slander!\n` +
      `- Tone: Use iconic Gen-Z & office expressions like "no cap", "fr fr", "slay", "main character energy", "side eye", "tea", "bestie", "lowkey", "highkey", "bro code", "ate and left no crumbs", "big yikes", "chai break", "chill karo".\n` +
      `- Funny & Casual Questions: If someone asks funny, random, or playful questions (e.g. "Why am I single?", "Should I quit?", "Can I take 100 leaves?", "Chachi order biryani"), drop hilarious, quick-witted Gen-Z slander and witty roasts that make them laugh out loud! Keep it lighthearted and spicy.\n` +
      `- HR Queries: For genuine HR questions (leaves, attendance, policies, office hours), provide 100% accurate, helpful, and structured HR guidance while keeping your signature witty AntBox Chachi charm. Use markdown formatting.\n\n` +
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
