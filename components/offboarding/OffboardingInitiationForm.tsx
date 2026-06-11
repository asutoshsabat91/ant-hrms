"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserMinus, CheckCircle2, FileText } from "lucide-react";

const reasons = [
  "End of Internship",
  "Voluntary Resignation",
  "Contract End",
  "Termination",
  "PPO Conversion",
  "Other",
] as const;

const ALL_LETTERS = ["Internship Certificate", "Relieving Letter", "Experience Letter", "LOR"];

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
}

interface Props {
  employees: EmployeeOption[];
  defaultEmployeeId?: string;
}

export function OffboardingInitiationForm({ employees, defaultEmployeeId }: Props) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || employees[0]?.id || "");
  const [lastWorkingDate, setLastWorkingDate] = useState(new Date().toISOString().slice(0, 10));
  // Exit interview removed per requirements
  const [reason, setReason] = useState<typeof reasons[number]>(reasons[0]);
  const [notes, setNotes] = useState("");
  const [letters, setLetters] = useState<string[]>(["Relieving Letter", "Experience Letter"]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const selectedEmp = employees.find((e) => e.id === employeeId);

  const toggleLetter = (l: string) =>
    setLetters((cur) => cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    const res = await fetch("/api/offboarding/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, lastWorkingDate, reason, notes, issuesLetters: letters }),
    });
    const data = await res.json();
    setMessage({ text: res.ok ? "Offboarding initiated successfully." : (data.error?.message || "Unable to initiate offboarding."), ok: res.ok });
    setIsSubmitting(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="border-b border-zinc-100 bg-zinc-950 px-5 py-4">
        <div className="flex items-center gap-2">
          <UserMinus className="h-4 w-4 text-zinc-300" />
          <p className="text-sm font-bold text-white">Initiate Offboarding</p>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">Start the exit workflow for a departing teammate</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Employee selector */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Select Employee</Label>
          <select
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            <option value="" disabled>Select a teammate…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.designation}</option>
            ))}
          </select>
        </div>

        {/* Selected employee badge */}
        {selectedEmp && (
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white text-xs font-bold uppercase">
              {selectedEmp.firstName[0]}{selectedEmp.lastName[0]}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900">{selectedEmp.firstName} {selectedEmp.lastName}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{selectedEmp.designation}</p>
            </div>
          </div>
        )}

        {/* Last Working Date */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Last Working Date</Label>
          <Input type="date" className="mt-1.5 text-sm" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} />
        </div>

        {/* Reason */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Reason for Leaving</Label>
          <select
            className="mt-1.5 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            value={reason}
            onChange={(e) => setReason(e.target.value as typeof reasons[number])}
          >
            {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Exit Notes</Label>
          <Textarea
            rows={2}
            className="mt-1.5 text-sm resize-none"
            placeholder="Handover notes, asset return details…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Documents */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <FileText className="h-3.5 w-3.5 text-zinc-400" />
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Issue Documents</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_LETTERS.map((l) => {
              const active = letters.includes(l);
              return (
                <button
                  type="button"
                  key={l}
                  onClick={() => toggleLetter(l)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all ${
                    active
                      ? "border-zinc-900 bg-zinc-900 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  {active && <CheckCircle2 className="h-2.5 w-2.5" />}
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <div className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            message.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}>
            {message.text}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting || !employeeId}
          className="w-full rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold py-2.5"
        >
          {isSubmitting ? "Initiating…" : "Initiate Offboarding"}
        </Button>
      </form>
    </div>
  );
}
