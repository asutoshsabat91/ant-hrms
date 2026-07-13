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
      `You are the official AntBox HR AI Assistant (Bhubaneswar, Odisha). ` +
      `Your role is to assist employees and administrators with questions about company policy, guidelines, leaves, payroll structures, and attendance. ` +
      `Keep your replies professional, warm, structured, and helpful. Use markdown formatting. \n\n` +
      `Here is some real-time context about AntBox HRMS: \n` +
      `- Active Deployed Employees: ${employeeCount}\n` +
      `- Core Departments: ${deptListStr}\n` +
      `- Office Location: Patia, Bhubaneswar, Odisha\n` +
      `- Working Hours: 10:00 AM to 7:00 PM, Monday to Friday.\n\n` +
      `Always maintain a helpful attitude. Avoid speculating on private database values that you do not have.`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
      systemInstruction,
    });

    const geminiHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

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
