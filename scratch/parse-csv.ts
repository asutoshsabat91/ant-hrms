import fs from "fs";
import path from "path";

function parseCsv() {
  const filePath = "/Users/asutoshsabat/.gemini/antigravity-ide/brain/a8b66047-5b1a-4ac7-9f34-87a7faef76f5/.system_generated/steps/837/content.md";
  const content = fs.readFileSync(filePath, "utf-8");
  
  // Find where the CSV content starts
  const csvStartIndex = content.indexOf("Employee ID,Full Name,Designation,Client");
  if (csvStartIndex === -1) {
    throw new Error("Could not find CSV header");
  }
  
  const csvPart = content.substring(csvStartIndex);
  const lines = csvPart.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  const headers = lines[0].split(",");
  const employees: any[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Split by comma, but handle potential quoted values if any
    const cols = line.split(",");
    if (cols.length < 12) continue;
    
    const empId = cols[0].trim();
    const fullName = cols[1].trim();
    const designation = cols[2].trim() || "Associate";
    const client = cols[3].trim() || "AntBox";
    const clientJoining = cols[4].trim();
    const clientLeaving = cols[5].trim();
    const empType = cols[6].trim() || "INTERN";
    const dateOfJoiningStr = cols[7].trim();
    const reportingManager = cols[8].trim();
    const contactNumber = cols[9].trim();
    const personalEmail = cols[10].trim();
    const officialEmail = cols[11].trim();
    const bankAccount = cols[12].trim();
    const status = cols[13] ? cols[13].trim() : "";
    
    if (!officialEmail) continue;
    
    // Parse name
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Employee";
    
    // Parse date
    let joiningDate = new Date();
    if (dateOfJoiningStr) {
      const parsedDate = Date.parse(dateOfJoiningStr);
      if (!isNaN(parsedDate)) {
        joiningDate = new Date(parsedDate);
      } else {
        // Fallback for custom formats like "28-05-2026" or "15 May 2026"
        const parts = dateOfJoiningStr.split(/[- ]+/);
        if (parts.length === 3) {
          // If in DD-MM-YYYY format
          if (parts[2].length === 4) {
            joiningDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        }
      }
    }
    
    employees.push({
      employeeId: empId.startsWith("ANT-") ? empId : `ANT-${empId.padStart(3, "0")}`,
      fullName,
      firstName,
      lastName,
      designation,
      client,
      clientJoining,
      clientLeaving,
      empType: empType.toUpperCase() === "FULL TIME" || empType.toUpperCase() === "FULL_TIME" ? "FULL_TIME" : "INTERN",
      joiningDate: joiningDate.toISOString(),
      reportingManager,
      contactNumber,
      personalEmail: personalEmail || null,
      officialEmail: officialEmail.toLowerCase(),
      bankAccount,
      status: status || "ACTIVE"
    });
  }
  
  console.log(`Parsed ${employees.length} employees successfully.`);
  fs.writeFileSync("/Users/asutoshsabat/ANTBOX/antbox-hrms/scratch/employees.json", JSON.stringify(employees, null, 2));
}

parseCsv();
