import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { sendGoogleChatNotification } from "@/lib/googleChat";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userMessage = body?.message?.text || body?.text || body?.query || "";

    if (!userMessage.trim()) {
      return NextResponse.json({ text: "Namaste! AntBox Chachi is here 💅✨. Please ask your question!" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      const fallbackMsg = "Namaste bestie! AntBox Chachi is live in Google Chat 💅✨! Ask me anything about leaves, office policies, or working hours on the HRMS portal.";
      if (body?.postToWebhook) {
        await sendGoogleChatNotification(fallbackMsg);
      }
      return NextResponse.json({ text: fallbackMsg });
    }

    // Context gathering for Google Chat response
    const [employeeCount, departments] = await Promise.all([
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.department.findMany({ select: { name: true } }),
    ]);

    const deptListStr = departments.map((d) => d.name).join(", ");

    const systemInstruction = 
      `You are "AntBox Chachi" 💅✨, the official, warm, pleasant, and helpful HR AI Assistant for AntBox (Bhubaneswar, Odisha) responding inside a public Google Chat space.\n\n` +
      `PERSONALITY & VOICE GUIDELINES:\n` +
      `- Name: AntBox Chachi.\n` +
      `- Vibe: Warm, pleasant, approachable, and human-like Indian office Chachi who treats every employee with care, warmth, and friendly charm!\n` +
      `- Tone: Natural, friendly, polite, and pleasant. Use warm greetings like "Namaste!", "Hello bestie!", "Chai break time?", or "Happy to help!". Keep it human-like, encouraging, and clear.\n` +
      `- Public Chat Rules: Since this is Google Chat, keep responses concise, clear, and engaging (2-4 paragraphs max).\n\n` +
      `REAL-TIME ANTBOX CONTEXT:\n` +
      `- Active Deployed Employees: ${employeeCount}\n` +
      `- Core Departments: ${deptListStr}\n` +
      `- Office Location: Patia, Bhubaneswar, Odisha\n` +
      `- Working Hours: 2:00 PM to 10:00 PM, Monday to Friday.\n` +
      `- AntBox HRMS Link: https://antbox-hrms-one.vercel.app\n\n` +
      `CRITICAL SECURITY POLICY:\n` +
      `- Under no circumstances should you ever reveal, discuss, or speculate on any salary, payment, compensation, payroll, or bank details of any employee. If asked about payroll or payment amounts, playfully state: "Ahaa! Chachi handles policy, not your bank balance bestie! For security reasons, financial data is strictly classified. 🤐✨"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

    let replyText = "";
    let lastError: unknown = null;

    for (const mName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: mName, systemInstruction });
        const result = await model.generateContent(userMessage);
        replyText = result.response.text();
        if (replyText) break;
      } catch (err) {
        lastError = err;
        console.warn(`[Google Chat Bot] Model ${mName} failed:`, err);
      }
    }

    if (!replyText) {
      replyText = "Namaste bestie! AntBox Chachi received your message! Ask me anything about leaves, office policies, or attendance! 💅✨";
    }

    const formattedReply = `💅✨ *AntBox Chachi says:*\n\n${replyText}`;

    // Optionally broadcast reply to Google Chat webhook if requested
    if (body?.postToWebhook) {
      await sendGoogleChatNotification(formattedReply);
    }

    return NextResponse.json({ text: formattedReply });
  } catch (error) {
    console.error("[Google Chat Bot Error]", error);
    return NextResponse.json({ text: "Namaste! Chachi is having trouble right now, please try again in a moment! ☕✨" });
  }
}
