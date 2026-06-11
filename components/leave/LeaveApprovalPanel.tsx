"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ApprovalRequest = {
  id: string;
  employee: { firstName: string; lastName: string; managerId?: string | null };
  leaveType: { name: string };
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
};

type LeaveApiResponse = {
  approvalRequests?: ApprovalRequest[];
  error?: string;
};

const badgeVariant = (status: string) => {
  switch (status) {
    case "APPROVED":
      return "secondary";
    case "REJECTED":
      return "destructive";
    case "PENDING":
    default:
      return "default";
  }
};

export function LeaveApprovalPanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  async function loadRequests() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/leave");
      const payload: LeaveApiResponse = await response.json();
      if (!response.ok) {
        setError(payload?.error || "Unable to load approval requests.");
      } else {
        setRequests(payload.approvalRequests ?? []);
      }
    } catch {
      setError("Unable to load approval requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleDecision(id: string, action: "APPROVE" | "REJECT") {
    setSubmittingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/leave/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: action === "REJECT" ? rejectionNotes[id] ?? "" : undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to update request status.");
      } else {
        setRequests((current) => current.filter((request) => request.id !== id));
      }
    } catch {
      setError("Unable to update request status.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approvals</CardTitle>
        <CardDescription>Review pending leave requests from your team.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--neutral-500)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading approvals...</span>
          </div>
        ) : error ? (
          <div className="space-y-2 text-sm text-[var(--destructive)]">
            <p>{error}</p>
          </div>
        ) : requests.length === 0 ? (
          <p className="text-sm text-[var(--neutral-500)]">No pending leave approvals at the moment.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[var(--neutral-700)]">
                  <div>
                    <p className="font-semibold">{request.employee.firstName} {request.employee.lastName}</p>
                    <p>{request.leaveType.name} · {request.days.toFixed(1)} day{request.days === 1 ? "" : "s"}</p>
                  </div>
                  <Badge variant={badgeVariant(request.status)}>{request.status}</Badge>
                </div>
                <p className="mb-3 text-sm text-[var(--neutral-600)]">
                  {new Date(request.startDate).toLocaleDateString()} — {new Date(request.endDate).toLocaleDateString()}
                </p>
                <p className="mb-3 text-sm text-[var(--neutral-700)]">{request.reason}</p>
                <div className="space-y-3">
                  <Textarea
                    className="min-h-[6rem]"
                    placeholder="Optional rejection note"
                    value={rejectionNotes[request.id] ?? ""}
                    onChange={(event) =>
                      setRejectionNotes((prev) => ({ ...prev, [request.id]: event.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => handleDecision(request.id, "APPROVE")}
                      disabled={!!submittingId}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleDecision(request.id, "REJECT")}
                      disabled={!!submittingId}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
