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
}

export function BulkOnboardingModal({ departments, employees }: BulkOnboardingModalProps) {
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
    const headers = ["First Name", "Last Name", "Company Email", "Designation", "Department", "Joining Date (YYYY-MM-DD)"];
    
    const sampleRows = [
      ["Riya", "Sharma", "riya@antbox.com", "Developer Intern", departments[0]?.name || "Data Analytics", new Date().toISOString().slice(0, 10)],
      ["Adarsh", "Mohanty", "adarsh@antbox.com", "Software Engineer", departments[0]?.name || "Data Analytics", new Date().toISOString().slice(0, 10)]
    ];
    
    // Add BOM marker \uFEFF to make Excel open the file properly with UTF-8 encoding
    const csvContent = "\uFEFF" + [headers.join(","), ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "mass_onboarding_template.csv");
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

      const importedRows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length < 5) continue; // Skip incomplete lines

        const firstName = values[0] || "";
        const lastName = values[1] || "";
        const email = values[2] || "";
        const designation = values[3] || "";
        const deptName = values[4] || "";
        const joiningDate = values[5] || new Date().toISOString().slice(0, 10);

        const matchedDept = departments.find(
          (d) => d.name.toLowerCase() === deptName.toLowerCase()
        ) || departments[0];

        importedRows.push({
          firstName,
          lastName,
          email,
          designation,
          departmentId: matchedDept?.id || "",
          joiningDate,
          employmentType: "FULL_TIME",
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
