"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Upload, Banknote, XCircle, Clock, Receipt } from "lucide-react";

type ReimbursementType = "REIMBURSEMENT" | "PROCUREMENT";
type ReimbursementStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAID";

interface ReimbursementRecord {
  id: string;
  type: ReimbursementType;
  title: string;
  category: string;
  amount: number;
  date: string;
  status: ReimbursementStatus;
  approvedBy?: string | null;
  receiptUrl?: string | null;
  description?: string | null;
  employee: { firstName: string; lastName: string; employeeId: string } | null;
}

interface Props {
  reimbursements: ReimbursementRecord[];
  isAdmin?: boolean;
  employmentType?: string;
}

const STATUS_COLORS: Record<ReimbursementStatus, string> = {
  DRAFT: "bg-zinc-100 text-zinc-600",
  SUBMITTED: "bg-sky-100 text-sky-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-rose-100 text-rose-700",
  PAID: "bg-violet-100 text-violet-700",
};

const STATUS_LABELS: Record<ReimbursementStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

function StatusBadge({ status }: { status: ReimbursementStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ReimbursementPortal({ reimbursements: initialData, isAdmin = false, employmentType }: Props) {
  const isIntern = employmentType === "INTERN";
  const [activeTab, setActiveTab] = useState<ReimbursementType>(isIntern ? "PROCUREMENT" : "REIMBURSEMENT");
  const [items, setItems] = useState<ReimbursementRecord[]>(initialData);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [receiptUrls, setReceiptUrls] = useState<Record<string, string>>({});

  const filtered = items.filter((i) => i.type === activeTab);

  async function submitRequest() {
    if (!title.trim() || !category.trim() || !amount || parseFloat(amount) <= 0) {
      setError("Please fill all required fields with valid values.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/reimbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, amount: parseFloat(amount), date, description, type: activeTab }),
      });
      const data = await res.json();
      if (!res.ok) {
        let errorMsg = "Failed to submit request.";
        if (data.error) {
          if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (typeof data.error === "object") {
            if (data.error.fieldErrors) {
              const fields = Object.entries(data.error.fieldErrors)
                .map(([field, msgs]) => {
                  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                  return `${fieldName}: ${(msgs as string[]).join(", ")}`;
                })
                .join("; ");
              if (fields) errorMsg = fields;
            } else if (data.error.formErrors && Array.isArray(data.error.formErrors) && data.error.formErrors.length > 0) {
              errorMsg = data.error.formErrors.join(", ");
            } else if (data.error.message) {
              errorMsg = data.error.message;
            } else {
              errorMsg = JSON.stringify(data.error);
            }
          }
        }
        setError(errorMsg);
        return;
      }
      setItems((prev) => [{ ...data.reimbursement, type: activeTab }, ...prev]);
      setTitle(""); setCategory(""); setAmount(""); setDescription("");
      setSuccess(`${activeTab === "PROCUREMENT" ? "Procurement request" : "Reimbursement"} submitted!`);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  async function doAction(id: string, action: string, extra?: Record<string, unknown>) {
    setActionLoading(id + action);
    try {
      const res = await fetch(`/api/reimbursements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || "Action failed."); return; }
      setItems((prev) => prev.map((r) => r.id === id ? { ...r, ...data.reimbursement } : r));
    } catch { alert("Something went wrong."); }
    finally { setActionLoading(null); }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      {!isIntern && (
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1 w-fit">
          {(["REIMBURSEMENT", "PROCUREMENT"] as ReimbursementType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); }}
              className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === tab ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab === "REIMBURSEMENT" ? "Reimbursements" : "Procurement"}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Submission Form */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">
              {activeTab === "PROCUREMENT" ? "Request Procurement" : "Submit Expense"}
            </CardTitle>
            <CardDescription className="text-xs">
              {activeTab === "PROCUREMENT"
                ? "Request admin approval before purchasing — upload receipt once approved."
                : "Submit your expense for reimbursement."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-zinc-600">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Office Headset" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Equipment" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Amount (₹)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600">Description</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 text-sm resize-none" />
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            {success && <p className="text-xs text-emerald-600">{success}</p>}
            <Button onClick={submitRequest} disabled={loading} size="sm" className="w-full">
              {loading ? "Submitting…" : activeTab === "PROCUREMENT" ? "Request Approval" : "Submit Claim"}
            </Button>
          </CardContent>
        </Card>

        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-400 py-8 text-center">
              No {activeTab === "PROCUREMENT" ? "procurement requests" : "reimbursements"} yet.
            </p>
          )}
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-100 bg-white p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="text-xs text-zinc-400">{item.category} · ₹{item.amount.toLocaleString()}</p>
                  {item.employee && (
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {item.employee.firstName} {item.employee.lastName} · {item.employee.employeeId}
                    </p>
                  )}
                  {item.approvedBy && (
                    <p className="text-[10px] text-emerald-600 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Approved by {item.approvedBy}
                    </p>
                  )}
                </div>
                <StatusBadge status={item.status} />
              </div>

              {/* Procurement pipeline progress */}
              {item.type === "PROCUREMENT" && (
                <div className="flex gap-2 text-[10px] flex-wrap">
                  {(["UNDER_REVIEW", "APPROVED", "SUBMITTED", "PAID"] as const).map((s, i) => {
                    const stages = ["UNDER_REVIEW", "APPROVED", "SUBMITTED", "PAID"];
                    const labels = ["Review", "Approved", "Receipt", "Paid"];
                    const icons = [Clock, CheckCircle2, Receipt, Banknote];
                    const Icon = icons[i];
                    const reached = stages.indexOf(item.status) >= i;
                    return (
                      <span key={s} className={`flex items-center gap-1 ${reached ? "text-emerald-600 font-semibold" : "text-zinc-300"}`}>
                        {i > 0 && <span className="text-zinc-200">→</span>}
                        <Icon className="h-3 w-3" />{labels[i]}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {!isAdmin && item.status === "DRAFT" && item.type === "REIMBURSEMENT" && (
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    disabled={actionLoading === item.id + "submit"}
                    onClick={() => doAction(item.id, "submit")}>
                    Submit Claim
                  </Button>
                )}
                {!isAdmin && item.status === "APPROVED" && item.type === "PROCUREMENT" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      placeholder="Receipt URL"
                      className="h-7 text-xs w-44"
                      value={receiptUrls[item.id] ?? ""}
                      onChange={(e) => setReceiptUrls((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    />
                    <Button size="sm" className="h-7 text-xs gap-1"
                      disabled={actionLoading === item.id + "submit"}
                      onClick={() => doAction(item.id, "submit", { receiptUrl: receiptUrls[item.id] })}>
                      <Upload className="h-3 w-3" /> Upload Receipt
                    </Button>
                  </div>
                )}
                {isAdmin && ["UNDER_REVIEW", "SUBMITTED", "DRAFT"].includes(item.status) && (
                  <Button size="sm" className="h-7 text-xs bg-emerald-500 hover:bg-emerald-600 gap-1"
                    disabled={actionLoading === item.id + "approve"}
                    onClick={() => doAction(item.id, "approve")}>
                    <CheckCircle2 className="h-3 w-3" /> Approve
                  </Button>
                )}
                {isAdmin && ["APPROVED", "SUBMITTED"].includes(item.status) && (
                  <Button size="sm" className="h-7 text-xs bg-violet-500 hover:bg-violet-600 gap-1"
                    disabled={actionLoading === item.id + "pay"}
                    onClick={() => doAction(item.id, "pay")}>
                    <Banknote className="h-3 w-3" /> Mark Paid
                  </Button>
                )}
                {isAdmin && ["UNDER_REVIEW", "SUBMITTED", "DRAFT", "APPROVED"].includes(item.status) && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                    disabled={actionLoading === item.id + "reject"}
                    onClick={() => doAction(item.id, "reject")}>
                    <XCircle className="h-3 w-3" /> Reject
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
