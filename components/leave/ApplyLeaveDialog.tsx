"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { differenceInCalendarDays } from "date-fns";
import { X } from "lucide-react";

interface LeaveTypeItem {
  id: string;
  name: string;
  code?: string;
}

interface LeaveBalanceItem {
  leaveType: { code: string; name: string };
  allocated?: number;
  used?: number;
}

interface LeaveRequestItem {
  id: string;
  employee: { firstName: string; lastName: string; employeeId: string };
  leaveType: { name: string };
  startDate: string | Date;
  endDate: string | Date;
  days: number;
  status: string;
  reason?: string;
}

interface ApplyLeaveDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  leaveTypes: LeaveTypeItem[];
  onSuccess: (freshRequests: LeaveRequestItem[], freshBalances: LeaveBalanceItem[]) => void;
  employmentType?: string;
}

export function ApplyLeaveDialog({
  isOpen,
  onOpenChange,
  leaveTypes,
  onSuccess,
  employmentType = "FULL_TIME",
}: ApplyLeaveDialogProps) {
  const filteredLeaveTypes = useMemo(() => {
    const isIntern = employmentType === "INTERN";
    const allowedCodes = isIntern
      ? ["PAID_QUARTER", "LOP", "ACADEMIC", "OPTIONAL_HOLIDAY", "WFH"]
      : ["EARNED", "FLOATER", "BEREAVEMENT", "COMP_OFF", "OPTIONAL_HOLIDAY", "WFH"];
    
    return (leaveTypes || []).filter((type) => {
      const code = type.code || "";
      return allowedCodes.includes(code);
    });
  }, [leaveTypes, employmentType]);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const firstInputRef = useRef<HTMLSelectElement>(null);

  // Focus first field and set default selected type when opening
  useEffect(() => {
    if (isOpen) {
      if (filteredLeaveTypes.length > 0 && filteredLeaveTypes[0]) {
        setSelectedTypeId(filteredLeaveTypes[0].id);
      }
      if (firstInputRef.current) {
        setTimeout(() => firstInputRef.current?.focus(), 50);
      }
    }
  }, [isOpen, filteredLeaveTypes]);

  // Only portal-render on the client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onOpenChange]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Compute duration — pure calculation, no hooks needed
  let durationDays = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
      durationDays = differenceInCalendarDays(e, s) + 1;
    }
  }

  const resetForm = useCallback(() => {
    setStartDate("");
    setEndDate("");
    setReason("");
    setFormError(null);
    setSelectedTypeId(filteredLeaveTypes[0]?.id || "");
  }, [filteredLeaveTypes]);

  const handleClose = useCallback(() => {
    resetForm();
    onOpenChange(false);
  }, [onOpenChange, resetForm]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedTypeId || !startDate || !endDate || !reason.trim()) {
        setFormError("Please fill out all fields.");
        return;
      }
      if (reason.trim().length < 5) {
        setFormError("Reason must be at least 5 characters long.");
        return;
      }
      setSubmitting(true);
      setFormError(null);
      try {
        const res = await fetch("/api/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaveTypeId: selectedTypeId,
            startDate,
            endDate,
            reason: reason.trim(),
          }),
        });
        const payload = await res.json();
        if (!res.ok) {
          let errorMsg = "Unable to submit leave request.";
          if (payload.error) {
            if (typeof payload.error === "string") {
              errorMsg = payload.error;
            } else if (typeof payload.error === "object") {
              if (payload.error.fieldErrors) {
                const fields = Object.entries(payload.error.fieldErrors)
                  .map(([field, msgs]) => {
                    const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                    return `${fieldName}: ${(msgs as string[]).join(", ")}`;
                  })
                  .join("; ");
                if (fields) errorMsg = fields;
              } else if (payload.error.formErrors && Array.isArray(payload.error.formErrors) && payload.error.formErrors.length > 0) {
                errorMsg = payload.error.formErrors.join(", ");
              } else if (payload.error.message) {
                errorMsg = payload.error.message;
              } else {
                errorMsg = JSON.stringify(payload.error);
              }
            }
          }
          setFormError(errorMsg);
          return;
        }
        handleClose();
        const freshRes = await fetch("/api/leave");
        const freshData = await freshRes.json();
        if (freshData?.myRequests) {
          onSuccess(freshData.myRequests, freshData.leaveBalances ?? []);
        }
      } catch {
        setFormError("An error occurred. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [selectedTypeId, startDate, endDate, reason, handleClose, onSuccess]
  );

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Apply for Leave"
      style={{ position: "fixed", inset: 0, zIndex: 9999 }}
    >
      {/* Backdrop — plain semi-transparent div, NO backdrop-blur */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 448,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 16, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#09090b", letterSpacing: "-0.02em" }}>
                Apply for Leave
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Submit a time off request for approval
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              style={{
                background: "none",
                border: "1px solid #e4e4e7",
                borderRadius: 8,
                width: 28,
                height: 28,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#71717a",
                flexShrink: 0,
              }}
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Leave Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Leave Type</label>
            <select
              ref={firstInputRef}
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              style={inputStyle}
            >
              {filteredLeaveTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>


          {/* Date Range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Duration Pill */}
          {durationDays > 0 && (
            <div style={{
              background: "#fafafa",
              border: "1px solid #e4e4e7",
              borderRadius: 12,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 12, color: "#52525b", fontWeight: 500 }}>Requested Duration:</span>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#09090b",
                background: "#e4e4e7",
                padding: "3px 10px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {durationDays} day{durationDays === 1 ? "" : "s"}
              </span>
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Brief explanation for time off..."
              style={{ ...inputStyle, resize: "none", height: "auto" }}
            />
          </div>

          {/* Error */}
          {formError && (
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#e11d48",
              background: "#fff1f2",
              border: "1px solid #fecdd3",
              borderRadius: 8,
              padding: "8px 12px",
              marginBottom: 16,
            }}>
              {formError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
            <button
              type="button"
              onClick={handleClose}
              style={cancelBtnStyle}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={submitBtnStyle(submitting)}
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// Style constants — defined outside render to prevent object recreation
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 700,
  color: "#71717a",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e4e4e7",
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 12,
  fontWeight: 500,
  color: "#18181b",
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  border: "1px solid #e4e4e7",
  borderRadius: 10,
  padding: "9px 16px",
  fontSize: 11,
  fontWeight: 700,
  color: "#3f3f46",
  background: "#fff",
  cursor: "pointer",
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  border: "none",
  borderRadius: 10,
  padding: "9px 20px",
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  background: disabled ? "#a1a1aa" : "#09090b",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.7 : 1,
});
