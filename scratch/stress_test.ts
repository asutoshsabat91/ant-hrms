import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== STARTING CONCURRENCY STRESS TEST ===");

  // 1. Get a test employee
  const employee = await prisma.employee.findFirst({
    include: { user: true },
  });

  if (!employee) {
    console.error("No employee found in database to run stress test!");
    return;
  }

  console.log(`Using test employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.id})`);

  // 2. Clear pre-existing test data to ensure clean slate
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const testLeaveStart = new Date("2027-01-01T00:00:00.000Z");
  const testLeaveEnd = new Date("2027-01-02T23:59:59.999Z");
  const testRegDate = new Date("2027-02-01T00:00:00.000Z");

  console.log("Cleaning up existing test records...");
  const deletedPunches = await prisma.attendancePunch.deleteMany({
    where: { employeeId: employee.id },
  });
  const deletedAttendance = await prisma.attendanceRecord.deleteMany({
    where: { employeeId: employee.id, workDate: today },
  });
  const deletedLeaves = await prisma.leaveRequest.deleteMany({
    where: {
      employeeId: employee.id,
      startDate: { gte: testLeaveStart },
      endDate: { lte: testLeaveEnd },
    },
  });
  const deletedRegs = await prisma.regularizationRequest.deleteMany({
    where: { employeeId: employee.id, date: testRegDate },
  });

  console.log(`Cleaned up: ${deletedPunches.count} punches, ${deletedAttendance.count} attendance records, ${deletedLeaves.count} leave requests, ${deletedRegs.count} regularization requests.`);

  // Load a valid leave type
  const leaveType = await prisma.leaveType.findFirst();
  if (!leaveType) {
    console.error("No leave type found in database to test leaves!");
    return;
  }

  // --- TEST CASE 1: CONCURRENT PUNCHES (10 simultaneous punch-in requests) ---
  console.log("\n--- TEST CASE 1: CONCURRENT PUNCHES ---");
  console.log("Sending 10 concurrent Punch-In requests simultaneously...");
  
  const punchPromises = Array.from({ length: 10 }).map(async (_, idx) => {
    const now = new Date();
    try {
      const punch = await prisma.$transaction(async (tx) => {
        // Lock employee row
        await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${employee.id} FOR UPDATE`;

        // Fetch today's record under lock
        let record = await tx.attendanceRecord.findUnique({
          where: { employeeId_workDate: { employeeId: employee.id, workDate: today } },
          include: { punches: { orderBy: { punchedAt: "asc" } } },
        });

        // Prevent duplicate consecutive punches
        const lastPunch = record?.punches.at(-1);
        const nextType = lastPunch?.punchType === "IN" ? "OUT" : "IN";
        if ("IN" !== nextType) {
          throw new Error(`You have already punched ${lastPunch?.punchType || "OUT"}. Please alternate your punches.`);
        }

        // Create or update record
        if (!record) {
          record = await tx.attendanceRecord.create({
            data: {
              employeeId: employee.id,
              workDate: today,
              status: "PRESENT",
              checkIn: now,
            },
            include: { punches: { orderBy: { punchedAt: "asc" } } },
          });
        } else if (!record.checkIn) {
          record = await tx.attendanceRecord.update({
            where: { id: record.id },
            data: { checkIn: now },
            include: { punches: { orderBy: { punchedAt: "asc" } } },
          });
        }

        // Create punch record
        const newPunch = await tx.attendancePunch.create({
          data: {
            attendanceId: record.id,
            employeeId: employee.id,
            punchType: "IN",
            punchedAt: now,
            location: `Stress Test #${idx + 1}`,
          },
        });

        return newPunch;
      });
      return { idx, success: true, data: punch };
    } catch (err: any) {
      return { idx, success: false, error: err.message };
    }
  });

  const punchResults = await Promise.allSettled(punchPromises);
  let punchSuccesses = 0;
  let punchFailures = 0;

  punchResults.forEach((res) => {
    if (res.status === "fulfilled") {
      const val = res.value;
      if (val.success) {
        punchSuccesses++;
        console.log(`[Success] Request #${val.idx + 1} succeeded. Punch ID: ${val.data?.id}`);
      } else {
        punchFailures++;
        console.log(`[Rejected] Request #${val.idx + 1} failed: "${val.error}"`);
      }
    }
  });

  console.log(`Punches Summary: Successes = ${punchSuccesses}, Failures = ${punchFailures}`);
  if (punchSuccesses === 1) {
    console.log("✅ Concurrency check for Punches: SUCCESS (Only 1 punch succeeded).");
  } else {
    console.error(`❌ Concurrency check for Punches: FAILED (Expected exactly 1 success, got ${punchSuccesses})`);
  }

  // --- TEST CASE 2: CONCURRENT LEAVE REQUESTS (5 simultaneous overlapping leave requests) ---
  console.log("\n--- TEST CASE 2: CONCURRENT LEAVE REQUESTS ---");
  console.log(`Sending 5 concurrent leave requests for ${testLeaveStart.toDateString()} to ${testLeaveEnd.toDateString()}...`);

  const leavePromises = Array.from({ length: 5 }).map(async (_, idx) => {
    try {
      const leave = await prisma.$transaction(async (tx) => {
        // Lock employee row
        await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${employee.id} FOR UPDATE`;

        // Check overlapping request
        const existingOverlap = await tx.leaveRequest.findFirst({
          where: {
            employeeId: employee.id,
            status: { in: ["PENDING", "APPROVED"] },
            AND: [
              { startDate: { lte: testLeaveEnd } },
              { endDate: { gte: testLeaveStart } },
            ],
          },
        });

        if (existingOverlap) {
          throw new Error("You already have a leave request covering this period.");
        }

        const leaveRequest = await tx.leaveRequest.create({
          data: {
            employeeId: employee.id,
            leaveTypeId: leaveType.id,
            startDate: testLeaveStart,
            endDate: testLeaveEnd,
            days: 2,
            reason: `Stress Test #${idx + 1}`,
            status: "PENDING",
          },
        });

        return leaveRequest;
      });
      return { idx, success: true, data: leave };
    } catch (err: any) {
      return { idx, success: false, error: err.message };
    }
  });

  const leaveResults = await Promise.allSettled(leavePromises);
  let leaveSuccesses = 0;
  let leaveFailures = 0;

  leaveResults.forEach((res) => {
    if (res.status === "fulfilled") {
      const val = res.value;
      if (val.success) {
        leaveSuccesses++;
        console.log(`[Success] Request #${val.idx + 1} succeeded. Leave ID: ${val.data?.id}`);
      } else {
        leaveFailures++;
        console.log(`[Rejected] Request #${val.idx + 1} failed: "${val.error}"`);
      }
    }
  });

  console.log(`Leaves Summary: Successes = ${leaveSuccesses}, Failures = ${leaveFailures}`);
  if (leaveSuccesses === 1) {
    console.log("✅ Concurrency check for Leaves: SUCCESS (Only 1 leave request succeeded).");
  } else {
    console.error(`❌ Concurrency check for Leaves: FAILED (Expected exactly 1 success, got ${leaveSuccesses})`);
  }

  // --- TEST CASE 3: CONCURRENT REGULARIZATIONS (5 simultaneous regularization requests on same date) ---
  console.log("\n--- TEST CASE 3: CONCURRENT REGULARIZATIONS ---");
  console.log(`Sending 5 concurrent regularization requests for date ${testRegDate.toDateString()}...`);

  const regPromises = Array.from({ length: 5 }).map(async (_, idx) => {
    try {
      const reg = await prisma.$transaction(async (tx) => {
        // Lock employee row
        await tx.$executeRaw`SELECT * FROM "Employee" WHERE id = ${employee.id} FOR UPDATE`;

        // Check existing
        const existing = await tx.regularizationRequest.findFirst({
          where: { employeeId: employee.id, date: testRegDate },
        });

        if (existing) {
          throw new Error("A regularization request already exists for this date.");
        }

        const request = await tx.regularizationRequest.create({
          data: {
            employeeId: employee.id,
            date: testRegDate,
            type: "BOTH",
            reason: `Stress Test #${idx + 1}`,
            status: "PENDING",
          },
        });

        return request;
      });
      return { idx, success: true, data: reg };
    } catch (err: any) {
      return { idx, success: false, error: err.message };
    }
  });

  const regResults = await Promise.allSettled(regPromises);
  let regSuccesses = 0;
  let regFailures = 0;

  regResults.forEach((res) => {
    if (res.status === "fulfilled") {
      const val = res.value;
      if (val.success) {
        regSuccesses++;
        console.log(`[Success] Request #${val.idx + 1} succeeded. Regularization ID: ${val.data?.id}`);
      } else {
        regFailures++;
        console.log(`[Rejected] Request #${val.idx + 1} failed: "${val.error}"`);
      }
    }
  });

  console.log(`Regularization Summary: Successes = ${regSuccesses}, Failures = ${regFailures}`);
  if (regSuccesses === 1) {
    console.log("✅ Concurrency check for Regularization: SUCCESS (Only 1 request succeeded).");
  } else {
    console.error(`❌ Concurrency check for Regularization: FAILED (Expected exactly 1 success, got ${regSuccesses})`);
  }

  console.log("\n=== CONCURRENCY STRESS TEST COMPLETED ===");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
