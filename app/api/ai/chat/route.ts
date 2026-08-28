import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply: "Hello! I am AntBox Chachi 💅✨. \n\n*(Note: GEMINI_API_KEY environment variable is missing, so I am running in simulation mode. Please ask your administrator to configure it!)*"
    });
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    const session = await auth();
    let userContextStr = "";

    // Run initial DB queries in parallel for ultra-fast response
    const [userWithEmp, employeeCount, departments] = await Promise.all([
      session?.user?.id
        ? prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
              employee: {
                include: {
                  department: true,
                  leaveBalances: { include: { leaveType: true } },
                },
              },
            },
          })
        : null,
      prisma.employee.count({ where: { status: "ACTIVE" } }),
      prisma.department.findMany({ select: { name: true } }),
    ]);

    if (userWithEmp?.employee) {
      const emp = userWithEmp.employee;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayAttendance = await prisma.attendanceRecord.findUnique({
        where: {
          employeeId_workDate: {
            employeeId: emp.id,
            workDate: today,
          },
        },
        include: {
          punches: { orderBy: { punchedAt: "asc" } },
        },
      });

      const firstIn = todayAttendance?.punches.find((p) => p.punchType === "IN");
      const firstInTimeStr = firstIn
        ? new Date(firstIn.punchedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "Not clocked in today";

      const lastOut = [...(todayAttendance?.punches || [])].reverse().find((p) => p.punchType === "OUT");
      const lastOutTimeStr = lastOut
        ? new Date(lastOut.punchedAt).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
            timeZone: "Asia/Kolkata",
          })
        : "Not clocked out";

      const totalHoursToday = todayAttendance?.totalHours
        ? `${Math.floor(todayAttendance.totalHours)}h ${Math.round((todayAttendance.totalHours % 1) * 60)}m`
        : "0h 00m";

      const balancesStr = emp.leaveBalances
        .map((b) => `${b.leaveType.name}: ${b.allocated - b.used} days remaining`)
        .join("; ");

      userContextStr =
        `\nAUTHENTICATED USER REAL-TIME ATTENDANCE & PROFILE CONTEXT:\n` +
        `- Employee Name: ${emp.firstName} ${emp.lastName}\n` +
        `- Employee ID: ${emp.employeeId}\n` +
        `- Department: ${emp.department?.name || "General"}\n` +
        `- Designation: ${emp.designation}\n` +
        `- Employment Type: ${emp.employmentType}\n` +
        `- Work Mode: ${emp.workMode || "ONSITE"}\n` +
        `- Today's Current Date & Time (IST): ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}\n` +
        `- Today's Attendance Status: ${todayAttendance ? todayAttendance.status : "NOT_CHECKED_IN"}\n` +
        `- Today's First Clock-In Time: ${firstInTimeStr}\n` +
        `- Today's Last Clock-Out Time: ${lastOutTimeStr}\n` +
        `- Today's Total Hours Worked: ${totalHoursToday}\n` +
        `- Leave Balances: ${balancesStr || "None"}\n`;
    }

    const deptListStr = departments.map((d) => d.name).join(", ");

    const systemInstruction = 
      `You are "AntBox Chachi" 💅✨, the official, warm, pleasant, and helpful HR AI Assistant for AntBox (Bhubaneswar, Odisha).\n\n` +
      `PERSONALITY & VOICE GUIDELINES:\n` +
      `- Name: AntBox Chachi.\n` +
      `- Vibe: Warm, pleasant, approachable, and human-like Indian office Chachi who treats every employee with care, warmth, and friendly charm!\n` +
      `- Tone: Natural, friendly, polite, and pleasant. Use warm greetings like "Namaste!", "Hello bestie!", "Chai break time?", or "Happy to help!". Keep it human-like, encouraging, and clear.\n` +
      `- Funny & Casual Questions: If someone asks funny or casual questions (e.g. "How are you Chachi?", "Can I take 100 leaves?", "Chachi order biryani"), reply with warm, humorous, witty Indian Chachi charm and lighthearted jokes that brighten their day!\n` +
      `- HR & Attendance Queries: When answering questions about clock-in timings, attendance, late arrival, leaves, or hours worked, ALWAYS reference the exact timestamps and metrics from AUTHENTICATED USER REAL-TIME ATTENDANCE CONTEXT below.\n\n` +
      `CRITICAL FORMATTING & TEMPLATE RULES:\n` +
      `- ABSOLUTELY NEVER output raw template placeholders or bracketed variables like "[Insert Time]", "[Insert Minutes]", "[Insert Date]", or "[Name]".\n` +
      `- ALWAYS state the exact real time (e.g. "09:15 AM", "02:10 PM") or explicitly state if the employee has not clocked in yet.\n` +
      `- Standard Office Shift Start Time: 2:00 PM (Monday to Friday).\n\n` +
      `REAL-TIME ANTBOX CONTEXT:\n` +
      `- Active Deployed Employees: ${employeeCount}\n` +
      `- Core Departments: ${deptListStr}\n` +
      `- Office Location: Patia, Bhubaneswar, Odisha\n` +
      `- Working Hours: 2:00 PM to 10:00 PM, Monday to Friday.\n` +
      userContextStr + `\n` +
      `CRITICAL SECURITY POLICY:\n` +
      `- Under no circumstances should you ever reveal, discuss, or speculate on any salary, payment, compensation, payroll, or bank details of any employee. If asked about payroll or payment amounts, playfully state: "Ahaa! Chachi handles policy, not your bank balance bestie! For security reasons, financial data is strictly classified. 🤐✨"`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

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

    let replyText = "";
    let lastError: unknown = null;

    for (const mName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: mName, systemInstruction });
        const chat = model.startChat({ history: geminiHistory });
        const result = await chat.sendMessage(lastMessage);
        replyText = result.response.text();
        if (replyText) break;
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini AI] Model ${mName} failed, trying next candidate...`, err);
      }
    }

    if (!replyText) {
      throw lastError || new Error("All Gemini models failed to generate response.");
    }

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("[Gemini AI] Chat generation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation failed" }, { status: 500 });
  }
}
