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

    let session = null;
    try {
      session = await auth();
    } catch {
      session = null;
    }
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

    let todayAttendanceStatus = "NOT_CHECKED_IN";
    let firstInTimeStr = "Not clocked in today";
    let lastOutTimeStr = "Not clocked out";
    let totalHoursToday = "0h 00m";
    let balancesStr = "";

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

      if (todayAttendance) {
        todayAttendanceStatus = todayAttendance.status;
      }

      const firstIn = todayAttendance?.punches.find((p) => p.punchType === "IN");
      if (firstIn) {
        firstInTimeStr = new Date(firstIn.punchedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });
      }

      const lastOut = [...(todayAttendance?.punches || [])].reverse().find((p) => p.punchType === "OUT");
      if (lastOut) {
        lastOutTimeStr = new Date(lastOut.punchedAt).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });
      }

      if (todayAttendance?.totalHours) {
        totalHoursToday = `${Math.floor(todayAttendance.totalHours)}h ${Math.round((todayAttendance.totalHours % 1) * 60)}m`;
      }

      balancesStr = emp.leaveBalances
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
        `- Today's Attendance Status: ${todayAttendanceStatus}\n` +
        `- Today's First Clock-In Time: ${firstInTimeStr}\n` +
        `- Today's Last Clock-Out Time: ${lastOutTimeStr}\n` +
        `- Today's Total Hours Worked: ${totalHoursToday}\n` +
        `- Leave Balances: ${balancesStr || "None"}\n`;
    }

    const deptListStr = departments.map((d) => d.name).join(", ");

    const lastMessage = messages[messages.length - 1]?.content || "";

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

    let replyText = "";

    if (apiKey) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const candidateModels = ["gemini-3.6-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-latest", "gemini-flash-latest", "gemini-2.0-flash"];

        let geminiHistory = messages.slice(0, -1).map((msg: { role: string; content: string }) => ({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        }));

        const firstUserIdx = geminiHistory.findIndex((msg: { role: string }) => msg.role === "user");
        if (firstUserIdx !== -1) {
          geminiHistory = geminiHistory.slice(firstUserIdx);
        } else {
          geminiHistory = [];
        }

        for (const mName of candidateModels) {
          try {
            const model = genAI.getGenerativeModel({ model: mName, systemInstruction });
            const chat = model.startChat({ history: geminiHistory });
            const result = await chat.sendMessage(lastMessage);
            replyText = result.response.text();
            if (replyText) break;
          } catch (err) {
            console.warn(`[Gemini AI] Model ${mName} failed, trying next candidate...`, err);
          }
        }
      } catch (err) {
        console.warn("[Gemini AI] Generative AI call failed, switching to smart Chachi fallback...", err);
      }
    }

    if (!replyText) {
      replyText = generateFallbackReply(lastMessage, userWithEmp, todayAttendanceStatus, firstInTimeStr, lastOutTimeStr, totalHoursToday, balancesStr);
    }

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("[Gemini AI] Chat route error:", error);
    return NextResponse.json({
      reply: "Namaste bestie! 💅✨ Chachi is right here! Ask me about your attendance, leaves, or office policies and I will gladly assist you!"
    });
  }
}

function generateFallbackReply(
  userQuery: string,
  userWithEmp: unknown,
  todayAttendanceStatus: string,
  firstInTimeStr: string,
  lastOutTimeStr: string,
  totalHoursToday: string,
  balancesStr: string
): string {
  const query = userQuery.toLowerCase().trim();

  if (query.includes("salary") || query.includes("pay") || query.includes("ctc") || query.includes("bank") || query.includes("stipend") || query.includes("money")) {
    return "Ahaa! Chachi handles policy, not your bank balance bestie! For security reasons, financial data is strictly classified. 🤐✨";
  }

  if (["hi", "hello", "hey", "namaste", "good morning", "good afternoon", "good evening", "chachi"].some(g => query.includes(g))) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstName = (userWithEmp as any)?.employee?.firstName ? ` ${(userWithEmp as any).employee.firstName}` : "";
    return `Namaste${firstName}! 💅✨ I'm AntBox Chachi, your friendly HR assistant! How can I help you today? Ask me about your attendance, leave balances, or office policies!`;
  }

  if (query.includes("attendance") || query.includes("clock") || query.includes("check in") || query.includes("punch") || query.includes("in time") || query.includes("hours") || query.includes("late")) {
    return (
      `Namaste! 💅✨ Here is your real-time attendance update for today:\n\n` +
      `- **Status**: ${todayAttendanceStatus}\n` +
      `- **First Clock-In**: ${firstInTimeStr}\n` +
      `- **Last Clock-Out**: ${lastOutTimeStr}\n` +
      `- **Total Hours Worked**: ${totalHoursToday}\n\n` +
      `Standard office shift starts at **2:00 PM** (Monday to Friday)!`
    );
  }

  if (query.includes("leave") || query.includes("holiday") || query.includes("vacation") || query.includes("balance") || query.includes("time off")) {
    const balanceLines = balancesStr ? balancesStr.split("; ").map(b => `- ${b}`).join("\n") : "- No active leave balances found.";
    return (
      `Namaste! 💅✨ Here is your current leave balance:\n\n` +
      `${balanceLines}\n\n` +
      `To apply for time off, just head over to the **Leave** section and click **Apply for leave**!`
    );
  }

  if (query.includes("shift") || query.includes("time") || query.includes("policy") || query.includes("location") || query.includes("office") || query.includes("work")) {
    return (
      `Namaste! 💅✨ Here are the key AntBox office details:\n\n` +
      `- **Working Hours**: 2:00 PM to 10:00 PM (Monday to Friday)\n` +
      `- **Office Location**: Patia, Bhubaneswar, Odisha\n` +
      `- **Weekly Offs**: Saturday & Sunday\n\n` +
      `Let me know if you need anything else!`
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firstName = (userWithEmp as any)?.employee?.firstName ? ` ${(userWithEmp as any).employee.firstName}` : "";
  return (
    `Namaste${firstName}! 💅✨ Chachi is right here! How can I help you?\n\n` +
    `You can ask me about:\n` +
    `- Today's clock-in time & attendance status\n` +
    `- Your current leave balances\n` +
    `- Office shift timing (2:00 PM - 10:00 PM) & location!`
  );
}
