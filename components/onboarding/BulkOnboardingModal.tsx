"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Users, Send, CheckCircle2, Loader2, Sparkles, Download, Upload } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface OnboardingEmployee {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  employeeId: string;
  joiningDate: string;
  department: { name: string };
  onboardingTasks: { id: string; title: string; category: string; status: string }[];
}

interface BulkOnboardingModalProps {
  departments: Department[];
  employees: OnboardingEmployee[];
  isChandrita?: boolean;
}

export function BulkOnboardingModal({ departments, employees, isChandrita }: BulkOnboardingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"invite" | "banking">("invite");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Bulk Invite Form State
  const [rows, setRows] = useState([
    {
      firstName: "",
      lastName: "",
      email: "",
      designation: "",
      departmentId: departments[0]?.id || "",
      joiningDate: new Date().toISOString().slice(0, 10),
      employmentType: "FULL_TIME",
    },
  ]);

  // Bulk Banking Selection State
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        firstName: "",
        lastName: "",
        email: "",
        designation: "",
        departmentId: departments[0]?.id || "",
        joiningDate: new Date().toISOString().slice(0, 10),
        employmentType: "FULL_TIME",
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows((current) => current.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: string) => {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const downloadCSVTemplate = () => {
    const headers = [
      "Employee ID", "First Name", "Last Name", "Official Email", "Personal Email", "Phone",
      "Date of Birth", "Gender", "Blood Group", "Permanent Address", "City", "State", "Pincode",
      "Emergency Contact Name", "Emergency Contact Phone", "Designation", "Department",
      "Employment Type", "Status", "Joining Date",
      ...(isChandrita ? [] : ["CTC", "Basic Salary", "HRA", "Special Allowance", "PF", "Professional Tax"]),
      "Bank Name", "Bank Account Number", "IFSC Code", "PAN", "UAN"
    ];
    
    const sampleRows = [
      [
        "—", "Riya", "Sharma", "riya@antbox.com", "riya.personal@gmail.com", "9876543210",
        "2002-05-15", "Female", "O+", "Patia, Bhubaneswar", "Bhubaneswar", "Odisha", "751024",
        "Ramesh Sharma", "9876543211", "Developer Intern", departments[0]?.name || "Data Analytics",
        "INTERN", "ACTIVE", new Date().toISOString().slice(0, 10),
        ...(isChandrita ? [] : ["360000", "15000", "6000", "4000", "1800", "200"]),
        "HDFC Bank", "501002345678", "HDFC0000123", "ABCDE1234F", "100234567890"
      ],
      [
        "—", "Adarsh", "Mohanty", "adarsh@antbox.com", "—", "—",
        "—", "—", "—", "—", "—", "Odisha", "—",
        "—", "—", "Software Engineer", departments[0]?.name || "Data Analytics",
        "FULL_TIME", "ACTIVE", new Date().toISOString().slice(0, 10),
        ...(isChandrita ? [] : ["0", "0", "0", "0", "0", "200"]),
        "—", "—", "—", "—", "—"
      ]
    ];
    
    // Add BOM marker \uFEFF to make Excel open the file properly with UTF-8 encoding
    const csvContent = "\uFEFF" + [headers.join(","), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "master_employee_database_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length <= 1) {
        setMessage({ text: "The CSV file is empty or only contains headers.", ok: false });
        return;
      }

      // Simple CSV line parser respecting quotes for items containing commas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result.map(val => {
          if (val.startsWith('"') && val.endsWith('"')) {
            return val.slice(1, -1).replace(/""/g, '"');
          }
          return val;
        });
      };

      const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

      const getVal = (rowValues: string[], possibleHeaders: string[]): string => {
        for (const ph of possibleHeaders) {
          const index = headers.indexOf(ph.toLowerCase());
          if (index !== -1) {
            return rowValues[index] || "";
          }
        }
        return "";
      };

      const importedRows = [];

      for (let i = 1; i < lines.length; i++) {
        // Skip metadata / section headers
        if (lines[i].includes("SECTION") || lines[i].includes("ANTBOX HRMS") || lines[i].includes("Generated At") || lines[i].includes("Generated By")) {
          continue;
        }

        const values = parseCSVLine(lines[i]);
        if (values.length < 3) continue;

        const firstName = getVal(values, ["First Name", "firstName"]) || "";
        const lastName = getVal(values, ["Last Name", "lastName"]) || "";
        const email = getVal(values, ["Official Email", "Company Email", "email", "emailAddress"]) || "";
        const designation = getVal(values, ["Designation", "designation"]) || "";
        const deptName = getVal(values, ["Department", "department"]) || "";
        const joiningDate = getVal(values, ["Joining Date", "Joining Date (YYYY-MM-DD)", "joiningDate"]) || new Date().toISOString().slice(0, 10);

        if (!firstName && !lastName && !email) continue;

        const matchedDept = departments.find(
          (d) => d.name.toLowerCase() === deptName.toLowerCase()
        ) || departments[0];

        const employeeId = getVal(values, ["Employee ID", "employeeId"]);
        const personalEmail = getVal(values, ["Personal Email", "personalEmail"]);
        const phone = getVal(values, ["Phone", "phone", "phoneNumber"]);
        const dateOfBirth = getVal(values, ["Date of Birth", "Date of Birth (YYYY-MM-DD)", "dateOfBirth", "dob"]);
        const gender = getVal(values, ["Gender", "gender"]);
        const bloodGroup = getVal(values, ["Blood Group", "bloodGroup"]);
        const permanentAddress = getVal(values, ["Permanent Address", "permanentAddress"]);
        const city = getVal(values, ["City", "city"]);
        const state = getVal(values, ["State", "state"]) || "Odisha";
        const pincode = getVal(values, ["Pincode", "pincode"]);
        const emergencyContact = getVal(values, ["Emergency Contact Name", "emergencyContact"]);
        const emergencyPhone = getVal(values, ["Emergency Contact Phone", "emergencyPhone"]);
        const employmentType = getVal(values, ["Employment Type", "Type", "employmentType"]) || "FULL_TIME";
        const status = getVal(values, ["Status", "status"]) || "ACTIVE";
        const ctc = getVal(values, ["CTC", "ctc"]);
        const basicSalary = getVal(values, ["Basic Salary", "basicSalary"]);
        const hra = getVal(values, ["HRA", "hra"]);
        const specialAllowance = getVal(values, ["Special Allowance", "specialAllowance"]);
        const pf = getVal(values, ["PF", "pf"]);
        const professionalTax = getVal(values, ["Professional Tax", "professionalTax"]);
        const bankName = getVal(values, ["Bank Name", "bankName"]);
        const bankAccountNo = getVal(values, ["Bank Account Number", "Bank Account No", "bankAccountNo"]);
        const ifscCode = getVal(values, ["IFSC Code", "ifscCode"]);
        const pan = getVal(values, ["PAN", "pan"]);
        const uan = getVal(values, ["UAN", "uan"]);

        const personalDetailsFilled = !!(personalEmail || phone || uan || pan || bankAccountNo);

        importedRows.push({
          firstName,
          lastName,
          email,
          designation,
          departmentId: matchedDept?.id || "",
          joiningDate,
          employmentType,
          employeeId,
          personalEmail,
          phone,
          dateOfBirth,
          gender,
          bloodGroup,
          permanentAddress,
          city,
          state,
          pincode,
          emergencyContact,
          emergencyPhone,
          status,
          ctc,
          basicSalary,
          hra,
          specialAllowance,
          pf,
          professionalTax,
          bankName,
          bankAccountNo,
          ifscCode,
          pan,
          uan,
          personalDetailsFilled,
          onboardingWizardCompleted: personalDetailsFilled,
        });
      }

      if (importedRows.length > 0) {
        setRows(importedRows);
        setMessage({ text: `Successfully imported ${importedRows.length} hire(s) from CSV!`, ok: true });
      } else {
        setMessage({ text: "No valid rows found in the CSV file.", ok: false });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleGoogleSheetsSync = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/onboarding/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "google_sheets" }),
      });
      const data = await res.json();
      setMessage({
        text: res.ok
          ? `Successfully synced and onboarded ${data.count} employees from Google Sheet!`
          : data.error || "Failed to sync from Google Sheet.",
        ok: res.ok,
      });
      if (res.ok) {
        setRows([
          {
            firstName: "",
            lastName: "",
            email: "",
            designation: "",
            departmentId: departments[0]?.id || "",
            joiningDate: new Date().toISOString().slice(0, 10),
            employmentType: "FULL_TIME",
          },
        ]);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setMessage({ text: "Network error occurred.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkInvite = async () => {
    // Basic validation
    for (const row of rows) {
      if (!row.firstName.trim() || !row.lastName.trim() || !row.email.trim() || !row.designation.trim() || !row.departmentId) {
        setMessage({ text: "Please fill in all required fields for every employee.", ok: false });
        return;
      }
      if (!row.email.includes("@")) {
        setMessage({ text: `Invalid email address: ${row.email}`, ok: false });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/onboarding/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: rows }),
      });
      const data = await res.json();
      setMessage({
        text: res.ok
          ? `Successfully invited ${data.count} employees to onboarding!`
          : data.error || "Failed to invite employees.",
        ok: res.ok,
      });
      if (res.ok) {
        setRows([
          {
            firstName: "",
            lastName: "",
            email: "",
            designation: "",
            departmentId: departments[0]?.id || "",
            joiningDate: new Date().toISOString().slice(0, 10),
            employmentType: "FULL_TIME",
          },
        ]);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setMessage({ text: "Network error occurred.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkBankingAction = async (action: "request_banking" | "approve_banking") => {
    if (selectedEmployees.length === 0) {
      setMessage({ text: "Please select at least one employee.", ok: false });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/onboarding/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedEmployees, action }),
      });
      const data = await res.json();
      setMessage({ text: data.message || "Action executed successfully.", ok: res.ok });
      if (res.ok) {
        setSelectedEmployees([]);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setMessage({ text: "Network error occurred.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    const onboardingEmployees = employees.filter(
      (e) => !e.onboardingTasks.some((t) => t.title.includes("Bank") && t.status === "COMPLETED")
    );
    if (selectedEmployees.length === onboardingEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(onboardingEmployees.map((e) => e.id));
    }
  };

  const toggleSelectEmployee = (id: string) => {
    setSelectedEmployees((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  };

  // Only show employees whose banking details are not yet approved
  const onboardingEmployeesWithPendingBanking = employees.filter(
    (e) => !e.onboardingTasks.some((t) => t.title.includes("Bank") && t.status === "COMPLETED")
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-400 animate-pulse" />
        Mass Onboarding
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative flex h-[85vh] w-[95vw] max-w-5xl flex-col rounded-3xl border border-[var(--border)] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-950 px-6 py-4 text-white">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-violet-400" />
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Mass Onboarding Panel</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Onboard multiple employees and manage banking setup in bulk.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessage(null);
                }}
                className="rounded-full p-1 hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Tabs Selector */}
            <div className="flex border-b border-zinc-100 px-6 py-2 gap-4 text-xs font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50/50">
              <button
                onClick={() => {
                  setActiveTab("invite");
                  setMessage(null);
                }}
                className={`pb-2 pt-2 border-b-2 transition-all ${
                  activeTab === "invite" ? "border-zinc-950 text-zinc-900" : "border-transparent hover:text-zinc-600"
                }`}
              >
                Bulk Invite New Hires
              </button>
              <button
                onClick={() => {
                  setActiveTab("banking");
                  setMessage(null);
                }}
                className={`pb-2 pt-2 border-b-2 transition-all ${
                  activeTab === "banking" ? "border-zinc-950 text-zinc-900" : "border-transparent hover:text-zinc-600"
                }`}
              >
                Bulk Banking Actions
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {message && (
                <div
                  className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
                    message.ok
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* TAB 1: BULK INVITE */}
              {activeTab === "invite" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full border-collapse text-left text-xs table-fixed min-w-[900px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <tr>
                          <th className="px-3 py-3 w-[14%]">First Name *</th>
                          <th className="px-3 py-3 w-[14%]">Last Name *</th>
                          <th className="px-3 py-3 w-[22%]">Company Email *</th>
                          <th className="px-3 py-3 w-[18%]">Designation *</th>
                          <th className="px-3 py-3 w-[16%]">Department *</th>
                          <th className="px-3 py-3 w-[12%]">Joining Date *</th>
                          <th className="px-3 py-3 w-[4%] text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {rows.map((row, index) => (
                          <tr key={index} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 outline-none focus:border-zinc-900"
                                value={row.firstName}
                                placeholder="Riya"
                                onChange={(e) => updateRow(index, "firstName", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 outline-none focus:border-zinc-900"
                                value={row.lastName}
                                placeholder="Sharma"
                                onChange={(e) => updateRow(index, "lastName", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="email"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 outline-none focus:border-zinc-900"
                                value={row.email}
                                placeholder="riya@antbox.com"
                                onChange={(e) => updateRow(index, "email", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 outline-none focus:border-zinc-900"
                                value={row.designation}
                                placeholder="Developer Intern"
                                onChange={(e) => updateRow(index, "designation", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 outline-none focus:border-zinc-900"
                                value={row.departmentId}
                                onChange={(e) => updateRow(index, "departmentId", e.target.value)}
                              >
                                {departments.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 outline-none focus:border-zinc-900"
                                value={row.joiningDate}
                                onChange={(e) => updateRow(index, "joiningDate", e.target.value)}
                              />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => removeRow(index)}
                                disabled={rows.length === 1}
                                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-rose-600 disabled:opacity-30 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={addRow}
                      className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5 text-zinc-500" />
                      Add Row
                    </button>

                    <button
                      onClick={downloadCSVTemplate}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm animate-pulse hover:animate-none"
                    >
                      <Download className="h-3.5 w-3.5 text-emerald-600" />
                      Download Excel/CSV Template
                    </button>

                    <label className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm cursor-pointer">
                      <Upload className="h-3.5 w-3.5 text-blue-600" />
                      <span>Import Excel/CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleCSVImport}
                      />
                    </label>

                    <button
                      onClick={handleGoogleSheetsSync}
                      disabled={loading}
                      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      )}
                      Sync from Google Sheet
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: BULK BANKING ACTIONS */}
              {activeTab === "banking" && (
                <div className="space-y-4">
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
                    <table className="w-full border-collapse text-left text-xs table-fixed min-w-[900px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 w-[5%] text-center">
                            <input
                              type="checkbox"
                              checked={
                                onboardingEmployeesWithPendingBanking.length > 0 &&
                                selectedEmployees.length === onboardingEmployeesWithPendingBanking.length
                              }
                              onChange={toggleSelectAll}
                              className="rounded border-zinc-300"
                            />
                          </th>
                          <th className="px-4 py-3 w-[15%]">Employee ID</th>
                          <th className="px-4 py-3 w-[20%]">Name</th>
                          <th className="px-4 py-3 w-[20%]">Designation</th>
                          <th className="px-4 py-3 w-[15%]">Department</th>
                          <th className="px-4 py-3 w-[13%]">Joining Date</th>
                          <th className="px-4 py-3 w-[12%]">Banking State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {onboardingEmployeesWithPendingBanking.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                              No employees currently in onboarding with pending banking details.
                            </td>
                          </tr>
                        ) : (
                          onboardingEmployeesWithPendingBanking.map((emp) => {
                            const isRequested = emp.onboardingTasks.some(
                              (t) => t.title.includes("Bank") && t.status === "PENDING"
                            );
                            return (
                              <tr key={emp.id} className="hover:bg-zinc-50/50 transition-colors">
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedEmployees.includes(emp.id)}
                                    onChange={() => toggleSelectEmployee(emp.id)}
                                    className="rounded border-zinc-300"
                                  />
                                </td>
                                <td className="px-4 py-3 font-semibold text-zinc-900">{emp.employeeId}</td>
                                <td className="px-4 py-3 font-bold text-zinc-900">
                                  {emp.firstName} {emp.lastName}
                                </td>
                                <td className="px-4 py-3 text-zinc-600">{emp.designation}</td>
                                <td className="px-4 py-3 text-zinc-600">{emp.department.name}</td>
                                <td className="px-4 py-3 text-zinc-600">
                                  {new Date(emp.joiningDate).toDateString()}
                                </td>
                                <td className="px-4 py-3">
                                  {isRequested ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                      Requested
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600">
                                      Not Requested
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessage(null);
                }}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancel
              </button>

              {activeTab === "invite" ? (
                <button
                  onClick={handleBulkInvite}
                  disabled={loading}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-5 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-violet-400" />
                  )}
                  <span>{loading ? "Inviting Hires..." : `Launch Onboarding for ${rows.length} Hires`}</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkBankingAction("request_banking")}
                    disabled={loading || selectedEmployees.length === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 text-violet-600" />
                    )}
                    <span>Request Banking</span>
                  </button>

                  <button
                    onClick={() => handleBulkBankingAction("approve_banking")}
                    disabled={loading || selectedEmployees.length === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    )}
                    <span>Approve Banking</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
