"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { differenceInCalendarDays } from "date-fns";

type LeaveType = {
  id: string;
  name: string;
};

type LeaveBalance = {
  id: string;
  year: number;
  allocated: number;
  used: number;
  pending: number;
  carryover: number;
  leaveType: { id: string; name: string };
};

type LeaveApiResponse = {
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  error?: string;
};

export function LeaveRequestForm() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leave");
      const payload: LeaveApiResponse = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Unable to load leave settings.");
        return;
      }
      setLeaveTypes(payload.leaveTypes);
      setLeaveBalances(payload.leaveBalances);
      setSelectedType(payload.leaveTypes[0]?.id ?? null);
    } catch {
      setError("Unable to load leave settings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedBalance = useMemo(
    () => leaveBalances.find((balance) => balance.leaveType.id === selectedType),
    [leaveBalances, selectedType]
  );

  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return differenceInCalendarDays(end, start) + 1;
  }, [startDate, endDate]);

  async function handleSubmit() {
    if (!selectedType || !startDate || !endDate || !reason.trim()) {
      setError("Please complete all fields before submitting.");
      setMessage(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveTypeId: selectedType, startDate, endDate, reason }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to submit leave request.");
      } else {
        setMessage(`Leave request submitted for ${days} day${days === 1 ? "" : "s"}.`);
        setStartDate("");
        setEndDate("");
        setReason("");
        loadData();
      }
    } catch {
      setError("Unable to submit leave request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New leave request</CardTitle>
        <CardDescription>Submit a new leave request and track approval status.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--neutral-500)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading leave details...</span>
          </div>
        ) : error ? (
          <div className="space-y-2 text-sm text-[var(--destructive)]">
            <p>{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">
                  Leave type
                </label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{
                      leaveTypes.find((type) => type.id === selectedType)?.name || "Select leave type"
                    }</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">
                  Start date
                </label>
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">
                  End date
                </label>
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">
                  Duration
                </label>
                <div className="flex h-8 items-center rounded-lg border border-input bg-transparent px-3 text-sm text-[var(--neutral-700)]">
                  {days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "Select dates"}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">
                Reason
              </label>
              <Textarea value={reason} onChange={(event) => setReason(event.target.value)} />
            </div>

            {selectedBalance && (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-sm text-[var(--neutral-700)]">
                <p className="font-semibold">Balance snapshot</p>
                <p>Allocated: {selectedBalance.allocated.toFixed(1)} days</p>
                <p>Used: {selectedBalance.used.toFixed(1)} days</p>
                <p>Pending: {selectedBalance.pending.toFixed(1)} days</p>
                <p>Carryover: {selectedBalance.carryover.toFixed(1)} days</p>
              </div>
            )}

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit request"}
            </Button>

            {message && (
              <div className="flex items-center gap-2 rounded-2xl border border-[var(--success)] bg-success/10 px-3 py-2 text-sm text-[var(--success)]">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
