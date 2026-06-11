"use client";

import { useState } from "react";
import { CheckCircle2, FileText, CreditCard, IdCard, ExternalLink, Bell, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BankingData {
  bankName?: string | null;
  bankAccountNo?: string | null;
  ifscCode?: string | null;
  pan?: string | null;
  uan?: string | null;
}

interface Props {
  employeeId: string;
  isAdmin: boolean;
  isOwnProfile: boolean;
  milestone1Done: boolean;
  milestone2Done: boolean;
  milestone3Done: boolean;
  bankingData: BankingData;
  employeeName: string;
  employeeEmail: string;
  employeeIdCode: string;
  bloodGroup?: string | null;
}

function MilestoneCard({
  number, title, icon: Icon, done, locked, children, adminAction,
}: {
  number: number; title: string; icon: React.ComponentType<{ className?: string }>;
  done: boolean; locked?: boolean; children: React.ReactNode; adminAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(!done);
  return (
    <div className={`rounded-xl border transition-all ${done ? "border-emerald-200 bg-emerald-50/30" : locked ? "border-zinc-100 bg-zinc-50/50 opacity-60" : "border-zinc-200 bg-white shadow-sm"}`}>
      <button type="button" onClick={() => !locked && setOpen((o) => !o)}
        className="flex w-full items-center justify-between p-4 text-left" disabled={locked}>
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-emerald-500 text-white" : locked ? "bg-zinc-200 text-zinc-400" : "bg-zinc-950 text-white"}`}>
            {done ? <CheckCircle2 className="h-4 w-4" /> : number}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Icon className={`h-3.5 w-3.5 ${done ? "text-emerald-600" : locked ? "text-zinc-400" : "text-[var(--purple)]"}`} />
              <span className={`text-sm font-bold ${done ? "text-emerald-800" : locked ? "text-zinc-400" : "text-zinc-900"}`}>{title}</span>
            </div>
            <span className={`text-[10px] font-semibold ${done ? "text-emerald-600" : locked ? "text-zinc-400" : "text-zinc-400"}`}>
              {done ? "Completed" : locked ? "Locked — complete previous step first" : "Pending"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {adminAction}
          {!locked && (open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />)}
        </div>
      </button>
      {open && !locked && <div className="border-t border-zinc-100 p-4">{children}</div>}
    </div>
  );
}

export function OnboardingMilestones({
  employeeId, isAdmin, isOwnProfile,
  milestone1Done, milestone2Done, milestone3Done,
  bankingData, employeeName, employeeEmail, employeeIdCode, bloodGroup,
}: Props) {
  // Banking form state
  const [bankName, setBankName] = useState(bankingData.bankName ?? "");
  const [bankAccountNo, setBankAccountNo] = useState(bankingData.bankAccountNo ?? "");
  const [ifscCode, setIfscCode] = useState(bankingData.ifscCode ?? "");
  const [pan, setPan] = useState(bankingData.pan ?? "");
  const [uan, setUan] = useState(bankingData.uan ?? "");
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ID form state
  const [linkedIn, setLinkedIn] = useState("");
  const [spotify, setSpotify] = useState("");
  const [bg, setBg] = useState(bloodGroup ?? "");
  const [idSaving, setIdSaving] = useState(false);
  const [idMsg, setIdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Notification state
  const [notifLoading, setNotifLoading] = useState<string | null>(null);

  async function sendNotification(step: string) {
    setNotifLoading(step);
    await fetch("/api/onboarding/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, step }),
    });
    setNotifLoading(null);
  }

  async function saveBanking() {
    setBankSaving(true); setBankMsg(null);
    try {
      const res = await fetch("/api/onboarding/banking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, bankName, bankAccountNo, ifscCode, pan, uan }),
      });
      const data = await res.json();
      setBankMsg({ ok: res.ok, text: res.ok ? "Banking details saved!" : (data.error || "Failed.") });
      if (res.ok) setTimeout(() => window.location.reload(), 1000);
    } catch { setBankMsg({ ok: false, text: "Something went wrong." }); }
    finally { setBankSaving(false); }
  }

  async function saveIdForm() {
    setIdSaving(true); setIdMsg(null);
    try {
      const res = await fetch("/api/onboarding/idform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, linkedInUrl: linkedIn, spotifyPlaylist: spotify, bloodGroup: bg }),
      });
      const data = await res.json();
      setIdMsg({ ok: res.ok, text: res.ok ? "ID form submitted! Admin will create your ID card." : (data.error || "Failed.") });
      if (res.ok) setTimeout(() => window.location.reload(), 1500);
    } catch { setIdMsg({ ok: false, text: "Something went wrong." }); }
    finally { setIdSaving(false); }
  }

  const inputCls = "mt-1 text-sm";

  return (
    <div className="space-y-3">
      {/* ── MILESTONE 1: DOCUMENTS ── */}
      <MilestoneCard
        number={1} title="Documents" icon={FileText} done={milestone1Done}
        adminAction={isAdmin && !milestone1Done ? (
          <button type="button" onClick={() => sendNotification("documents")}
            className="flex items-center gap-1 text-[10px] font-semibold text-[var(--purple)] hover:underline"
            disabled={notifLoading === "documents"}>
            <Bell className="h-3 w-3" />{notifLoading === "documents" ? "Sending…" : "Remind"}
          </button>
        ) : undefined}
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-600">
            The employee must upload the following documents in the{" "}
            <a href="/documents" className="text-[var(--purple)] font-semibold hover:underline inline-flex items-center gap-0.5">
              Documents section <ExternalLink className="h-3 w-3" />
            </a>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              "Aadhaar Card",
              "PAN Card",
              "Degree / Diploma Certificate",
              "Experience Certificates",
              "Other Certifications",
            ].map((doc) => (
              <div key={doc} className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${milestone1Done ? "bg-emerald-400" : "bg-zinc-300"}`} />
                <span className="text-[10px] font-medium text-zinc-600">{doc}</span>
              </div>
            ))}
          </div>
          {!milestone1Done && (
            <div className="flex items-center gap-2 rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs text-sky-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              Go to the Documents section and upload these files. Once uploaded, this task will auto-complete.
            </div>
          )}
          {milestone1Done && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Documents verified.
            </div>
          )}
        </div>
      </MilestoneCard>

      {/* ── MILESTONE 2: BANKING ── */}
      <MilestoneCard
        number={2} title="Banking Details" icon={CreditCard}
        done={milestone2Done} locked={!milestone1Done && !isAdmin}
        adminAction={isAdmin && !milestone2Done ? (
          <button type="button" onClick={() => sendNotification("banking")}
            className="flex items-center gap-1 text-[10px] font-semibold text-[var(--purple)] hover:underline"
            disabled={notifLoading === "banking"}>
            <Bell className="h-3 w-3" />{notifLoading === "banking" ? "Sending…" : "Request Details"}
          </button>
        ) : undefined}
      >
        <div className="space-y-3">
          {milestone2Done ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-emerald-700 mb-2">
                <CheckCircle2 className="h-4 w-4" /> Banking details on file.
              </div>
              {[
                ["Bank", bankingData.bankName],
                ["Account No.", bankingData.bankAccountNo ? `••••${bankingData.bankAccountNo.slice(-4)}` : "—"],
                ["IFSC", bankingData.ifscCode],
                ["PAN", bankingData.pan],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{k}</span>
                  <span className="font-semibold text-zinc-800">{v || "—"}</span>
                </div>
              ))}
            </div>
          ) : (isOwnProfile || isAdmin) ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Fill in your bank details for payroll processing. Admin has requested this information.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Bank Name</label>
                  <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} placeholder="SBI / HDFC…" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Account No.</label>
                  <Input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className={inputCls + " font-mono"} placeholder="1234567890" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">IFSC Code</label>
                  <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} className={inputCls + " font-mono uppercase"} placeholder="SBIN0001234" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">PAN</label>
                  <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className={inputCls + " font-mono uppercase"} placeholder="ABCDE1234F" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">UAN (optional)</label>
                  <Input value={uan} onChange={(e) => setUan(e.target.value)} className={inputCls} placeholder="Universal Account No." />
                </div>
              </div>
              {bankMsg && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${bankMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {bankMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {bankMsg.text}
                </div>
              )}
              <Button onClick={saveBanking} disabled={bankSaving} size="sm" className="w-full">
                {bankSaving ? "Saving…" : "Submit Banking Details"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Waiting for admin to request banking details.</p>
          )}
        </div>
      </MilestoneCard>

      {/* ── MILESTONE 3: ID FORM ── */}
      <MilestoneCard
        number={3} title="ID Card Form" icon={IdCard}
        done={milestone3Done} locked={!milestone2Done && !isAdmin}
        adminAction={isAdmin && milestone3Done ? (
          <button type="button" onClick={() => sendNotification("idform")}
            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:underline">
            <CheckCircle2 className="h-3 w-3" /> ID Submitted
          </button>
        ) : undefined}
      >
        <div className="space-y-3">
          {milestone3Done ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> ID form submitted. Admin has been notified to create the ID card.
            </div>
          ) : (isOwnProfile || isAdmin) ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">Fill in the details below. Admin will use this to create your employee ID card.</p>
              {/* Read-only auto-populated fields */}
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-zinc-50 border border-zinc-100 p-3">
                {[
                  ["Name", employeeName],
                  ["Employee ID", employeeIdCode],
                  ["Antbox Email", employeeEmail],
                ].map(([k, v]) => (
                  <div key={k}>
                    <label className="text-[10px] font-bold uppercase text-zinc-400">{k}</label>
                    <p className="text-xs font-semibold text-zinc-700 mt-0.5">{v}</p>
                  </div>
                ))}
              </div>
              {/* Employee fills these */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Blood Group</label>
                  <select value={bg} onChange={(e) => setBg(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900">
                    <option value="">Select</option>
                    {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">LinkedIn Profile URL</label>
                  <Input value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/yourname" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Spotify Playlist Link (optional)</label>
                  <Input value={spotify} onChange={(e) => setSpotify(e.target.value)} className={inputCls} placeholder="https://open.spotify.com/playlist/…" />
                </div>
              </div>
              {idMsg && (
                <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${idMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                  {idMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {idMsg.text}
                </div>
              )}
              <Button onClick={saveIdForm} disabled={idSaving} size="sm" className="w-full">
                {idSaving ? "Submitting…" : "Submit ID Card Form"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Complete Banking Details to unlock this step.</p>
          )}
        </div>
      </MilestoneCard>
    </div>
  );
}
