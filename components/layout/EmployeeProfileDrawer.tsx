"use client";

import { format } from "date-fns";
import { useState } from "react";
import { X, User, Building2, CreditCard, Pencil, CheckCircle2, AlertCircle, Save, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmployeeProfile {
  id: string;
  employeeId: string;
  gender?: string | null;
  firstName: string;
  lastName: string;
  designation: string;
  jobRole?: string | null;
  department: { name: string };
  managerId?: string | null;
  employmentType: string;
  status: string;
  joiningDate: Date | string;
  phone?: string | null;
  personalEmail?: string | null;
  dateOfBirth?: Date | string | null;
  bloodGroup?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  ifscCode?: string | null;
  pan?: string | null;
  profilePhoto?: string | null;
  workMode?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  employee: EmployeeProfile;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="text-sm font-medium text-zinc-900 mt-0.5">{value || "—"}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--purple)]" />
          <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">{title}</p>
        </div>
        {action}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}

export function EmployeeProfileDrawer({ open, onClose, employee }: Props) {
  const [editingBank, setEditingBank] = useState(false);
  const [bankName, setBankName] = useState(employee.bankName ?? "");
  const [bankAccountNo, setBankAccountNo] = useState(employee.bankAccountNo ?? "");
  const [ifscCode, setIfscCode] = useState(employee.ifscCode ?? "");
  const [pan, setPan] = useState(employee.pan ?? "");
  const [bankSaving, setBankSaving] = useState(false);
  const [bankError, setBankError] = useState<string | null>(null);
  const [bankSuccess, setBankSuccess] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(employee.profilePhoto || null);
  const [photoUploading, setPhotoUploading] = useState(false);

  if (!open) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select a valid image file (JPG or PNG)."); return; }
    if (file.size > 3 * 1024 * 1024) { alert("File size must be under 3MB."); return; }

    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setCurrentPhoto(base64);
      try {
        await fetch("/api/employees/banking", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profilePhoto: base64, targetEmployeeId: employee.id }),
        });
      } catch (err) {
        console.error("Failed to upload profile photo:", err);
      } finally {
        setPhotoUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  async function saveBank() {
    setBankSaving(true);
    setBankError(null);
    setBankSuccess(false);
    try {
      const res = await fetch("/api/employees/banking", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankName, bankAccountNo, ifscCode, pan }),
      });
      const data = await res.json();
      if (!res.ok) { setBankError(data.error || "Failed to save."); return; }
      setBankSuccess(true);
      setEditingBank(false);
    } catch { setBankError("Something went wrong."); }
    finally { setBankSaving(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 flex h-screen w-[440px] flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="relative group flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-white font-bold text-base border-2 border-white/20 overflow-hidden shrink-0 shadow-inner">
              {currentPhoto ? (
                <img src={currentPhoto} alt={employee.firstName} className="h-full w-full object-cover" />
              ) : (
                <span>{employee.firstName[0]}{employee.lastName[0]}</span>
              )}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[8px] font-bold text-white gap-0.5 backdrop-blur-[1px]">
                <Camera className="h-4 w-4 text-white" />
                <span>{photoUploading ? "Saving..." : "Upload"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={photoUploading} />
              </label>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">
                {employee.firstName} {employee.lastName}
              </p>
              <p className="text-[10px] text-zinc-400 font-medium">
                {employee.employeeId} · {employee.jobRole || employee.designation}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-zinc-100 bg-zinc-50">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            employee.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700"
            : employee.status === "ONBOARDING" ? "bg-sky-100 text-sky-700"
            : employee.status === "OFFBOARDING" ? "bg-rose-100 text-rose-700"
            : "bg-zinc-100 text-zinc-600"
          }`}>
            {employee.status}
          </span>
          <span className="text-[10px] text-zinc-400">{employee.department.name} · {employee.employmentType.replace("_", " ")}</span>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Personal */}
          <Section icon={User} title="Personal Details">
            <Field label="Gender" value={employee.gender} />
            <Field label="Blood Group" value={employee.bloodGroup} />
            <Field
              label="Date of Birth"
              value={employee.dateOfBirth ? format(new Date(employee.dateOfBirth), "dd MMM yyyy") : null}
            />
            <Field label="Phone" value={employee.phone} />
            <Field label="Personal Email" value={employee.personalEmail} />
            <div className="col-span-2">
              <Field
                label="Address"
                value={[employee.address, employee.city, employee.state, employee.pincode].filter(Boolean).join(", ")}
              />
            </div>
          </Section>

          {/* Employment */}
          <Section icon={Building2} title="Employment">
            <Field label="Department" value={employee.department.name} />
            <Field label="Job Role" value={employee.jobRole || employee.designation} />
            <Field label="Employment Type" value={employee.employmentType.replace("_", " ")} />
            <Field label="Work Mode" value={employee.workMode || "ONSITE"} />
            <Field label="Status" value={employee.status} />
            <Field label="Joining Date" value={format(new Date(employee.joiningDate), "dd MMM yyyy")} />
          </Section>

          {/* Bank & Compliance */}
          <Section
            icon={CreditCard}
            title="Bank & Compliance"
            action={
              !editingBank ? (
                <button
                  onClick={() => setEditingBank(true)}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-semibold text-zinc-600 hover:border-[var(--purple)]/40 hover:text-[var(--purple)] transition-colors"
                >
                  <Pencil className="h-2.5 w-2.5" /> Edit
                </button>
              ) : null
            }
          >
            {editingBank ? (
              <>
                <div className="col-span-2 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Bank Name</label>
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1 text-sm h-8" placeholder="e.g. SBI" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Account No.</label>
                      <Input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="mt-1 text-sm h-8 font-mono" placeholder="123456789" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">IFSC Code</label>
                      <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} className="mt-1 text-sm h-8 font-mono uppercase" placeholder="SBIN0001234" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">PAN</label>
                      <Input value={pan} onChange={(e) => setPan(e.target.value)} className="mt-1 text-sm h-8 font-mono uppercase" placeholder="ABCDE1234F" />
                    </div>
                  </div>

                  {bankError && (
                    <div className="flex items-center gap-2 text-xs text-rose-600">
                      <AlertCircle className="h-3.5 w-3.5" /> {bankError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 flex-1"
                      onClick={() => { setEditingBank(false); setBankError(null); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7 flex-1 gap-1"
                      disabled={bankSaving}
                      onClick={saveBank}
                    >
                      <Save className="h-3 w-3" />
                      {bankSaving ? "Saving…" : "Save Details"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Field label="Bank" value={bankName || employee.bankName} />
                <Field
                  label="Account No."
                  value={
                    (bankAccountNo || employee.bankAccountNo)
                      ? `••••${(bankAccountNo || employee.bankAccountNo)!.slice(-4)}`
                      : null
                  }
                />
                <Field label="IFSC" value={ifscCode || employee.ifscCode} />
                <Field label="PAN" value={pan || employee.pan} />
                {bankSuccess && (
                  <div className="col-span-2 flex items-center gap-2 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Bank details saved.
                  </div>
                )}
              </>
            )}
          </Section>
        </div>
      </div>
    </>
  );
}
