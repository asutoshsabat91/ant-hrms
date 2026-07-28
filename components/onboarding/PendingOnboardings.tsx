"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldAlert, Sparkles, User, Mail, Phone, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ALLOWED_JOB_ROLES } from "@/lib/jobRoles";

type PendingRequest = {
  id: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  gender: string;
  phone: string | null;
  dateOfBirth: Date | string | null;
  createdAt: Date | string;
};

type Department = {
  id: string;
  name: string;
};

type Manager = {
  id: string;
  firstName: string;
  lastName: string;
};

type Template = {
  id: string;
  name: string;
};

interface PendingOnboardingsProps {
  requests: PendingRequest[];
  departments: Department[];
  managers: Manager[];
  templates: Template[];
  isChandrita?: boolean;
}

export function PendingOnboardings({ requests, departments, managers, templates, isChandrita }: PendingOnboardingsProps) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for the expanded approval configuration
  const [jobRole, setJobRole] = useState("");
  const [designation, setDesignation] = useState("New Joinee");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [managerId, setManagerId] = useState("");
  const [employmentType, setEmploymentType] = useState("INTERN");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [templateId, setTemplateId] = useState(templates[0]?.id || "");
  const [ctc, setCtc] = useState("");

  if (requests.length === 0) return null;

  async function handleAction(requestId: string | string[], action: "APPROVE" | "REJECT", isQuick = false) {
    if (Array.isArray(requestId)) {
      setLoadingId("BULK");
    } else {
      setLoadingId(requestId);
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload = action === "APPROVE" && !isQuick
        ? {
            requestId,
            action,
            designation: jobRole || designation,
            jobRole: jobRole || designation,
            departmentId,
            managerId: managerId || null,
            employmentType,
            joiningDate: new Date(joiningDate).toISOString(),
            templateId: templateId || null,
            ...(isChandrita ? {} : { ctc: ctc ? parseFloat(ctc) : null }),
          }
        : { requestId, action };

      const res = await fetch("/api/onboarding/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `Failed to ${action.toLowerCase()} request.`);
        return;
      }

      setSuccessMsg(`Joinee account(s) successfully ${action === "APPROVE" ? "approved & created" : "rejected"}!`);
      setExpandedId(null);
      router.refresh();
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-950/20 via-zinc-900/30 to-zinc-950/10 p-6 shadow-xl backdrop-blur-md mb-6">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
          <h2 className="text-base font-extrabold text-white uppercase tracking-wider">
            Pending Joinee Approvals ({requests.length})
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            disabled={loadingId !== null}
            onClick={() => {
              const allIds = requests.map(r => r.id);
              handleAction(allIds, "APPROVE", true);
            }}
            className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-white border border-emerald-500/20 shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {loadingId === "BULK" ? (
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            ) : (
              <Check className="h-3 w-3 text-white" />
            )}
            Approve All Pending ({requests.length})
          </button>
          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-purple-400 border border-purple-500/20">
            Superadmin Authorization Required
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 p-3 text-xs font-bold text-red-400">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-bold text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((request) => {
          const isExpanded = expandedId === request.id;
          const isLoading = loadingId === request.id;

          return (
            <div
              key={request.id}
              className={`rounded-2xl border transition-all ${
                isExpanded
                  ? "border-purple-500/40 bg-zinc-900/80 shadow-md"
                  : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
              }`}
            >
              {/* Header / Summary Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {request.firstName} {request.lastName}
                    </h3>
                    <p className="text-xs font-medium text-zinc-400 mt-0.5">
                      Submitted: {format(new Date(request.createdAt), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-300">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {request.personalEmail}
                  </span>
                  {request.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5 text-zinc-500" />
                      {request.phone}
                    </span>
                  )}
                  {request.dateOfBirth && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                      DOB: {format(new Date(request.dateOfBirth), "dd MMM yyyy")}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={loadingId !== null}
                    onClick={() => handleAction(request.id, "APPROVE", true)}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 px-3.5 py-1.5 text-xs font-black text-emerald-400 transition-all uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Quick Approve
                  </button>
                  <button
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedId(null);
                      } else {
                        setExpandedId(request.id);
                        // Reset form defaults
                        setDesignation("New Joinee");
                        setDepartmentId(departments[0]?.id || "");
                        setManagerId("");
                        setEmploymentType("INTERN");
                        setJoiningDate(new Date().toISOString().split("T")[0]);
                        setTemplateId(templates[0]?.id || "");
                        setCtc("");
                      }
                    }}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-3.5 py-1.5 text-xs font-black text-white transition-all uppercase tracking-wider"
                  >
                    {isExpanded ? "Close Config" : "Configure"}
                  </button>
                  <button
                    disabled={loadingId !== null}
                    onClick={() => handleAction(request.id, "REJECT")}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Expansion Configuration Form */}
              {isExpanded && (
                <div className="border-t border-zinc-800 p-5 bg-zinc-950/40 rounded-b-2xl space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Job Role</label>
                      <select
                        value={jobRole}
                        onChange={(e) => {
                          setJobRole(e.target.value);
                          setDesignation(e.target.value);
                        }}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      >
                        <option value="">Select official Job Role</option>
                        {ALLOWED_JOB_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Department</label>
                      <select
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      >
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Reporting Manager</label>
                      <select
                        value={managerId}
                        onChange={(e) => setManagerId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      >
                        <option value="">No Manager (None)</option>
                        {managers.map((m) => (
                          <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Employment Type</label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      >
                        <option value="INTERN">Intern</option>
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contract</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Joining Date</label>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Onboarding Template</label>
                      <select
                        value={templateId}
                        onChange={(e) => setTemplateId(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                      >
                        <option value="">Default Template Tasks</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {!isChandrita && (
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Annual CTC (INR)</label>
                        <input
                          type="number"
                          value={ctc}
                          onChange={(e) => setCtc(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                          placeholder="e.g. 600000"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
                    <button
                      disabled={isLoading}
                      onClick={() => handleAction(request.id, "APPROVE")}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-4 py-2 text-xs font-black transition-all shadow-[0_4px_12px_rgba(124,58,237,0.3)] disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Approve & Provision Account</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
