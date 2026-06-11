"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ShieldCheck, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Report {
  id: string;
  subject: string;
  description: string;
  createdAt: string;
  employee?: { firstName: string; lastName: string; employeeId: string };
}

interface Props {
  reports: Report[];
  isAdmin: boolean;
}

export function POSHPortal({ reports: initialReports, isAdmin }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit() {
    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/posh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, description }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to submit."); return; }
      setReports((prev) => [{ ...data.report, createdAt: data.report.createdAt }, ...prev]);
      setSubject("");
      setDescription("");
      setSuccess(true);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Confidentiality notice */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex gap-3">
        <Lock className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-900">Strictly Confidential</p>
          <p className="text-xs text-violet-700 mt-0.5">
            Your report is visible only to you and senior HR leadership. It will be handled with complete discretion as per the POSH Act, 2013.
          </p>
        </div>
      </div>

      {/* Submission form (only for non-admins) */}
      {!isAdmin && (
        <div className="rounded-2xl border border-zinc-100 bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--purple)]" />
            <p className="text-sm font-bold text-zinc-900">Submit a Report</p>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Your report has been submitted. HR leadership has been notified confidentially.
            </div>
          )}

          {!success && (
            <>
              <div>
                <label className="text-xs font-semibold text-zinc-600">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief subject of the incident" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Describe the incident in detail — date, time, location, persons involved, nature of harassment…"
                  className="mt-1 resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-xs text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
              <Button onClick={submit} disabled={loading} size="sm">
                {loading ? "Submitting…" : "Submit Confidential Report"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {isAdmin ? "All POSH Reports" : "Your Reports"}
          </p>
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-zinc-100 bg-white p-4 space-y-2">
              <div className="flex items-start justify-between">
                <p className="text-sm font-semibold text-zinc-900">{r.subject}</p>
                <span className="text-[10px] text-zinc-400">{format(new Date(r.createdAt), "dd MMM yyyy")}</span>
              </div>
              <p className="text-xs text-zinc-600 whitespace-pre-wrap">{r.description}</p>
              {isAdmin && r.employee && (
                <p className="text-[10px] text-zinc-400">
                  Submitted by: {r.employee.firstName} {r.employee.lastName} ({r.employee.employeeId})
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {reports.length === 0 && isAdmin && (
        <p className="text-sm text-zinc-400">No POSH reports on record.</p>
      )}
    </div>
  );
}
