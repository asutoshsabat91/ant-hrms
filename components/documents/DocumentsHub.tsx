"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import {
  FileText, Upload, CheckCircle2, AlertCircle, Download,
  ShieldCheck, GraduationCap, Briefcase, Building2, LogOut,
  Plus, X, ExternalLink, Star, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ─────────────────────────────────────────────────────────────────

type DocType =
  | "OFFER_LETTER" | "INTERNSHIP_AGREEMENT" | "RELIEVING_LETTER"
  | "INTERNSHIP_CERTIFICATE" | "BOOTCAMP_CERTIFICATE" | "EXPERIENCE_LETTER"
  | "LOR" | "PPO_LETTER" | "PROMOTION_LETTER" | "APPOINTMENT_LETTER" | "OTHER";

interface DocumentRecord {
  id: string;
  title: string;
  type: DocType;
  fileUrl: string;
  issuedDate: string;
  issuedBy: string;
  metadata: Record<string, unknown> | null;
  employee: { id: string; firstName: string; lastName: string; employeeId: string };
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

interface Props {
  isAdmin: boolean;
  currentEmployeeId: string | null;
  documents: DocumentRecord[];
  employees: EmployeeOption[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocType, string> = {
  OFFER_LETTER: "Offer Letter",
  INTERNSHIP_AGREEMENT: "Internship Agreement / NDA",
  RELIEVING_LETTER: "Relieving Letter",
  INTERNSHIP_CERTIFICATE: "Internship Certificate",
  BOOTCAMP_CERTIFICATE: "Certificate",
  EXPERIENCE_LETTER: "Experience Letter",
  LOR: "Letter of Recommendation",
  PPO_LETTER: "PPO Letter",
  PROMOTION_LETTER: "Promotion Letter",
  APPOINTMENT_LETTER: "Appointment Letter",
  OTHER: "Other Document",
};

// Onboarding compliance required documents
const REQUIRED_DOCS = [
  {
    id: "aadhaar",
    title: "Aadhaar Card",
    description: "Government-issued identity proof",
    type: "OTHER" as DocType,
    keywords: ["aadhaar", "aadhar", "uid", "uidai"],
    color: "violet",
    icon: ShieldCheck,
  },
  {
    id: "pan",
    title: "PAN Card",
    description: "Permanent Account Number card",
    type: "OTHER" as DocType,
    keywords: ["pan", "permanent account"],
    color: "violet",
    icon: ShieldCheck,
  },
  {
    id: "degree",
    title: "Degree / Diploma Certificate",
    description: "Highest academic qualification",
    type: "BOOTCAMP_CERTIFICATE" as DocType,
    keywords: ["degree", "diploma", "graduation", "btech", "bsc", "ba", "mtech", "mba", "msc"],
    color: "sky",
    icon: GraduationCap,
  },
  {
    id: "experience",
    title: "Experience Certificate",
    description: "From previous employer (if applicable)",
    type: "EXPERIENCE_LETTER" as DocType,
    keywords: ["experience", "relieving", "employment", "work", "job"],
    color: "amber",
    icon: Briefcase,
    optional: true,
  },
];

const ADDITIONAL_DOC_TYPES: { type: DocType; label: string }[] = [
  { type: "OFFER_LETTER", label: "Offer Letter" },
  { type: "APPOINTMENT_LETTER", label: "Appointment Letter" },
  { type: "INTERNSHIP_AGREEMENT", label: "Internship Agreement" },
  { type: "PPO_LETTER", label: "PPO Letter" },
  { type: "PROMOTION_LETTER", label: "Promotion Letter" },
  { type: "RELIEVING_LETTER", label: "Relieving Letter" },
  { type: "INTERNSHIP_CERTIFICATE", label: "Internship Certificate" },
  { type: "LOR", label: "Letter of Recommendation" },
  { type: "BOOTCAMP_CERTIFICATE", label: "Certificate / Course" },
  { type: "OTHER", label: "Other Document" },
];

function docMatchesRequired(doc: DocumentRecord, req: typeof REQUIRED_DOCS[0]): boolean {
  const t = (doc.title ?? "").toLowerCase();
  return req.keywords.some((kw) => t.includes(kw));
}

// ─── Color helpers ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; pill: string; iconBg: string }> = {
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    pill: "bg-violet-100 text-violet-700",
    iconBg: "bg-violet-100",
  },
  sky: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    pill: "bg-sky-100 text-sky-700",
    iconBg: "bg-sky-100",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    pill: "bg-amber-100 text-amber-700",
    iconBg: "bg-amber-100",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    pill: "bg-emerald-100 text-emerald-700",
    iconBg: "bg-emerald-100",
  },
};

// ─── Upload Modal ───────────────────────────────────────────────────────────

function UploadModal({
  defaultTitle,
  defaultType,
  employees,
  isAdmin,
  currentEmployeeId,
  onClose,
  onSuccess,
}: {
  defaultTitle?: string;
  defaultType?: DocType;
  employees: EmployeeOption[];
  isAdmin: boolean;
  currentEmployeeId: string | null;
  onClose: () => void;
  onSuccess: (doc: DocumentRecord) => void;
}) {
  const [title, setTitle] = useState(defaultTitle ?? "");
  const [type, setType] = useState<DocType>(defaultType ?? "OTHER");
  const [empId, setEmpId] = useState(currentEmployeeId ?? employees[0]?.id ?? "");
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [fileData, setFileData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("File must be under 5MB."); return; }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => setFileData(reader.result as string);
    reader.readAsDataURL(file);
  };

  async function submit() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (!empId) { setError("Select an employee."); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: empId,
          type,
          title,
          issuedDate,
          description: notes,
          fileData: fileData ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error?.formErrors?.join(", ") || "Upload failed."); return; }
      onSuccess(data.document);
      onClose();
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <>
      {mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-zinc-950">
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 text-white/70" />
                <p className="text-sm font-bold text-white">Upload Document</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {isAdmin && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-zinc-400">Employee</label>
                  <select
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400">Document Title <span className="text-rose-500">*</span></label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Aadhaar Card" />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400">Document Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as DocType)}
                  className="mt-1 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-zinc-900"
                >
                  {ADDITIONAL_DOC_TYPES.map((t) => (
                    <option key={t.type} value={t.type}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400">Issue Date</label>
                <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} className="mt-1" />
              </div>

              {/* File upload */}
              <label
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 gap-2 transition-all ${fileData ? "border-emerald-300 bg-emerald-50" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-zinc-100"}`}
              >
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
                {fileData ? (
                  <>
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <p className="text-xs font-semibold text-emerald-700">{fileName}</p>
                    <p className="text-[10px] text-emerald-500">Click to change</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-zinc-400" />
                    <p className="text-xs font-semibold text-zinc-600">Click to upload PDF or image</p>
                    <p className="text-[10px] text-zinc-400">Max 5MB · PDF, JPG, PNG</p>
                  </>
                )}
              </label>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400">Notes (optional)</label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" placeholder="Additional notes…" />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button size="sm" className="flex-1 gap-1 bg-zinc-950 hover:bg-zinc-800" disabled={loading} onClick={submit}>
                  <Upload className="h-3.5 w-3.5" />{loading ? "Uploading…" : "Upload Document"}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Required Document Card ─────────────────────────────────────────────────

function RequiredDocCard({
  reqDoc,
  uploadedDoc,
  onUpload,
  disabled,
}: {
  reqDoc: typeof REQUIRED_DOCS[0];
  uploadedDoc: DocumentRecord | null;
  onUpload: (title: string, type: DocType) => void;
  disabled?: boolean;
}) {
  const colors = COLOR_MAP[reqDoc.color];
  const Icon = reqDoc.icon;
  const isDone = !!uploadedDoc;

  return (
    <div
      className={`relative rounded-2xl border-2 p-5 transition-all ${
        isDone
          ? "border-emerald-200 bg-emerald-50/50"
          : disabled
          ? "border-zinc-100 bg-zinc-50/50 opacity-60"
          : `${colors.border} bg-white hover:shadow-md`
      }`}
    >
      {/* Status badge */}
      <div className="absolute top-3 right-3">
        {isDone ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> Uploaded
          </span>
        ) : reqDoc.optional ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">Optional</span>
        ) : (
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">Required</span>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-emerald-100" : colors.iconBg}`}>
          <Icon className={`h-5 w-5 ${isDone ? "text-emerald-600" : colors.text}`} />
        </div>
        <div className="flex-1 min-w-0 pr-16">
          <p className="text-sm font-bold text-zinc-900">{reqDoc.title}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">{reqDoc.description}</p>
          {isDone && uploadedDoc && (
            <p className="text-[10px] text-emerald-600 mt-1 font-semibold truncate">
              ✓ {uploadedDoc.title} · {format(new Date(uploadedDoc.issuedDate), "dd MMM yyyy")}
            </p>
          )}
        </div>
      </div>

      {!isDone && !disabled && (
        <button
          type="button"
          onClick={() => onUpload(reqDoc.title, reqDoc.type)}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${colors.bg} ${colors.text} hover:opacity-80`}
        >
          <Upload className="h-3.5 w-3.5" />
          Upload {reqDoc.title}
          <ArrowRight className="h-3 w-3 ml-auto" />
        </button>
      )}
      {isDone && uploadedDoc?.fileUrl && (
        <button
          onClick={() => {
            try {
              const link = document.createElement("a");
              link.href = uploadedDoc.fileUrl;
              link.download = uploadedDoc.title;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err) {
              console.error("Failed to view required document:", err);
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[10px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 transition-colors cursor-pointer"
        >
          <Download className="h-3 w-3" /> View Document
        </button>
      )}
    </div>
  );
}

// ─── Document Row (for additional docs list) ────────────────────────────────

function DocumentRow({ doc, isAdmin }: { doc: DocumentRecord; isAdmin: boolean }) {
  const handleView = () => {
    if (!doc.fileUrl) return;
    try {
      const link = document.createElement("a");
      link.href = doc.fileUrl;
      link.download = doc.title;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download document:", err);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-white p-3.5 shadow-sm hover:border-zinc-200 hover:bg-zinc-50/20 transition-all">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-50 border border-zinc-100">
          <FileText className="h-4 w-4 text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-900 truncate">{doc.title}</p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            {DOC_TYPE_LABELS[doc.type]} · {format(new Date(doc.issuedDate), "dd MMM yyyy")}
          </p>
          {isAdmin && (
            <p className="text-[10px] text-[#8e43ac] font-bold mt-0.5 truncate">{doc.employee.firstName} {doc.employee.lastName}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {doc.fileUrl && (
          <button
            onClick={handleView}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition-all cursor-pointer shadow-sm"
            title="Download / View document"
          >
            <Download className="h-3 w-3" /> View File
          </button>
        )}
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 shrink-0">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Admin Category View ────────────────────────────────────────────────────

const ADMIN_CATEGORIES = [
  {
    id: "compliance",
    label: "ID & Compliance",
    icon: ShieldCheck,
    colorClass: "text-violet-600",
    bgClass: "bg-violet-50",
    borderClass: "border-violet-200",
    keywords: ["aadhaar", "aadhar", "pan", "kyc", "id proof", "identity", "uid"],
    types: ["OTHER", "APPOINTMENT_LETTER", "INTERNSHIP_AGREEMENT"] as DocType[],
  },
  {
    id: "academic",
    label: "Degrees & Certificates",
    icon: GraduationCap,
    colorClass: "text-sky-600",
    bgClass: "bg-sky-50",
    borderClass: "border-sky-200",
    keywords: ["degree", "diploma", "certificate", "qualification", "marksheet", "btech", "bsc"],
    types: ["BOOTCAMP_CERTIFICATE"] as DocType[],
  },
  {
    id: "experience",
    label: "Experience Letters",
    icon: Briefcase,
    colorClass: "text-amber-600",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-200",
    keywords: ["experience", "reference", "recommendation", "relieving", "employment"],
    types: ["EXPERIENCE_LETTER", "LOR"] as DocType[],
  },
  {
    id: "company",
    label: "Company Documents",
    icon: Building2,
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-50",
    borderClass: "border-emerald-200",
    keywords: ["offer", "appointment", "agreement", "nda", "ppo", "promotion"],
    types: ["OFFER_LETTER", "APPOINTMENT_LETTER", "INTERNSHIP_AGREEMENT", "PPO_LETTER", "PROMOTION_LETTER"] as DocType[],
  },
  {
    id: "exit",
    label: "Exit Documents",
    icon: LogOut,
    colorClass: "text-rose-600",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-200",
    keywords: ["relieving", "internship certificate", "exit"],
    types: ["RELIEVING_LETTER", "INTERNSHIP_CERTIFICATE"] as DocType[],
  },
];

function matchesAdminCategory(doc: DocumentRecord, cat: typeof ADMIN_CATEGORIES[0]): boolean {
  const t = (doc.title ?? "").toLowerCase();
  if (cat.keywords.some((kw) => t.includes(kw))) return true;
  return (cat.types as string[]).includes(doc.type);
}

// ─── Main Hub ───────────────────────────────────────────────────────────────

export function DocumentsHub({ isAdmin, currentEmployeeId, documents: initialDocs, employees }: Props) {
  const [docs, setDocs] = useState<DocumentRecord[]>(initialDocs);
  const [uploadModal, setUploadModal] = useState<{ title?: string; type?: DocType } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [activeAdminTab, setActiveAdminTab] = useState("all");

  const addDoc = (doc: DocumentRecord) => setDocs((prev) => [doc, ...prev]);

  // ── Employee view: compute compliance status ────────────────────────────
  const myDocs = docs.filter((d) =>
    !currentEmployeeId || d.employee.id === currentEmployeeId
  );

  const requiredDocStatus = REQUIRED_DOCS.map((req) => ({
    req,
    uploaded: myDocs.find((d) => docMatchesRequired(d, req)) ?? null,
  }));

  const requiredDone = requiredDocStatus.filter((s) => !s.req.optional && s.uploaded).length;
  const requiredTotal = REQUIRED_DOCS.filter((r) => !r.optional).length;
  const milestone1Done = requiredDone >= requiredTotal;

  // Additional docs (not matching any required)
  const additionalDocs = myDocs.filter((d) =>
    !REQUIRED_DOCS.some((req) => docMatchesRequired(d, req))
  );

  // ── Admin view: filter by employee ─────────────────────────────────────
  const filteredDocs = selectedEmployee
    ? docs.filter((d) => d.employee.id === selectedEmployee)
    : docs;

  const adminCategories = ADMIN_CATEGORIES.map((cat) => ({
    cat,
    catDocs: filteredDocs.filter((d) => matchesAdminCategory(d, cat)),
  }));

  // ─────────────────────────────────────────────────────────────────────────
  // EMPLOYEE VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">HR · Documents</p>
            <h2 className="text-2xl font-extrabold text-zinc-950">My Documents</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Upload and manage your ID, certificates, and HR documents.</p>
          </div>
          <button
            type="button"
            onClick={() => setUploadModal({})}
            className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 hover:-translate-y-0.5 transition-all shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Upload Document
          </button>
        </div>

        {/* Onboarding Task 1 Banner */}
        <div className={`rounded-2xl border-2 p-5 ${milestone1Done ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-50/50" : "border-violet-200 bg-gradient-to-r from-violet-50 to-sky-50/50"}`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${milestone1Done ? "bg-emerald-100" : "bg-violet-100"}`}>
                {milestone1Done
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <Star className="h-5 w-5 text-violet-600" />
                }
              </div>
              <div>
                <p className={`text-sm font-bold ${milestone1Done ? "text-emerald-800" : "text-violet-800"}`}>
                  Onboarding Task 1 — Documents
                  {milestone1Done && <span className="ml-2 text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">COMPLETE ✓</span>}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {milestone1Done
                    ? "All required documents submitted. Admin has been notified."
                    : `Upload your required documents to complete onboarding step 1 (${requiredDone}/${requiredTotal} done).`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xl font-extrabold text-zinc-900">{requiredDone}/{requiredTotal}</p>
                <p className="text-[10px] text-zinc-400">required docs</p>
              </div>
              <div className="w-24">
                <div className="h-2.5 rounded-full bg-zinc-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${milestone1Done ? "bg-emerald-500" : "bg-violet-500"}`}
                    style={{ width: `${(requiredDone / requiredTotal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Required Documents Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Required Documents</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">These must be uploaded to complete your onboarding</p>
            </div>
            <a
              href={currentEmployeeId ? `/onboarding/${currentEmployeeId}` : "/onboarding"}
              className="flex items-center gap-1 text-[10px] font-semibold text-violet-600 hover:underline"
            >
              View Onboarding Tasks <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {requiredDocStatus.map(({ req, uploaded }) => (
              <RequiredDocCard
                key={req.id}
                reqDoc={req}
                uploadedDoc={uploaded}
                onUpload={(title, type) => setUploadModal({ title, type })}
              />
            ))}
          </div>
        </div>

        {/* Additional / Company Documents */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Additional Documents</h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">Offer letters, certifications, and other HR documents</p>
            </div>
            <button
              type="button"
              onClick={() => setUploadModal({})}
              className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add document
            </button>
          </div>
          {additionalDocs.length > 0 ? (
            <div className="space-y-2">
              {additionalDocs.map((d) => (
                <DocumentRow key={d.id} doc={d} isAdmin={false} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-100 py-10 text-center">
              <FileText className="h-10 w-10 text-zinc-200 mb-3" />
              <p className="text-sm font-semibold text-zinc-400">No additional documents yet</p>
              <p className="text-[10px] text-zinc-300 mt-1">Upload offer letters, certificates, or any other documents</p>
              <button
                type="button"
                onClick={() => setUploadModal({})}
                className="mt-4 flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Upload document
              </button>
            </div>
          )}
        </div>

        {/* Uploaded required docs list */}
        {myDocs.filter((d) => REQUIRED_DOCS.some((req) => docMatchesRequired(d, req))).length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-zinc-900 mb-3">Compliance Documents Uploaded</h3>
            <div className="space-y-2">
              {myDocs
                .filter((d) => REQUIRED_DOCS.some((req) => docMatchesRequired(d, req)))
                .map((d) => (
                  <DocumentRow key={d.id} doc={d} isAdmin={false} />
                ))}
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {uploadModal && (
          <UploadModal
            defaultTitle={uploadModal.title}
            defaultType={uploadModal.type}
            employees={employees}
            isAdmin={false}
            currentEmployeeId={currentEmployeeId}
            onClose={() => setUploadModal(null)}
            onSuccess={addDoc}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  const totalDocs = filteredDocs.length;
  const employeesMissingDocs = employees.filter(emp =>
    !docs.some(d => d.employee.id === emp.id && (
      d.title?.toLowerCase().includes("aadhaar") || d.title?.toLowerCase().includes("pan")
    ))
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">HR · Documents</p>
          <h2 className="text-2xl font-extrabold text-zinc-950">Documents</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Manage employee documents and compliance files</p>
        </div>
        <button
          type="button"
          onClick={() => setUploadModal({})}
          className="flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 hover:-translate-y-0.5 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Upload Document
        </button>
      </div>

      {/* Admin Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveAdminTab("all")}
          className={`flex flex-col rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${activeAdminTab === "all" ? "border-zinc-900 bg-zinc-950 text-white" : "border-zinc-100 bg-white hover:bg-zinc-50"}`}
        >
          <FileText className={`h-5 w-5 mb-2 ${activeAdminTab === "all" ? "text-white/70" : "text-zinc-400"}`} />
          <p className={`text-xl font-extrabold leading-none ${activeAdminTab === "all" ? "text-white" : "text-zinc-900"}`}>{totalDocs}</p>
          <p className={`text-[10px] font-semibold mt-1 ${activeAdminTab === "all" ? "text-white/60" : "text-zinc-400"}`}>All Documents</p>
        </button>
        {adminCategories.map(({ cat, catDocs }) => {
          const Icon = cat.icon;
          const isActive = activeAdminTab === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveAdminTab(cat.id)}
              className={`flex flex-col rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${isActive ? `${cat.bgClass} ${cat.borderClass}` : "border-zinc-100 bg-white hover:bg-zinc-50"}`}
            >
              <Icon className={`h-5 w-5 mb-2 ${isActive ? cat.colorClass : "text-zinc-400"}`} />
              <p className={`text-xl font-extrabold leading-none ${isActive ? cat.colorClass : "text-zinc-900"}`}>{catDocs.length}</p>
              <p className={`text-[10px] font-semibold mt-1 ${isActive ? cat.colorClass : "text-zinc-400"}`}>{cat.label}</p>
            </button>
          );
        })}
      </div>

      {/* Admin Compliance Alert */}
      {employeesMissingDocs > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs font-semibold text-amber-700">
            <strong>{employeesMissingDocs} employee{employeesMissingDocs > 1 ? "s" : ""}</strong> haven&apos;t uploaded Aadhaar/PAN yet. 
            <a href="/onboarding" className="ml-1 underline hover:no-underline">View onboarding hub →</a>
          </p>
        </div>
      )}

      {/* Employee filter */}
      {employees.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs font-semibold text-zinc-500">Filter by employee:</label>
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs outline-none focus:border-zinc-900"
          >
            <option value="">All employees ({docs.length})</option>
            {employees.map((e) => {
              const empDocCount = docs.filter(d => d.employee.id === e.id).length;
              return (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId}) — {empDocCount} docs</option>
              );
            })}
          </select>
          {selectedEmployee && (
            <button
              type="button"
              onClick={() => setSelectedEmployee("")}
              className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-700"
            >
              <X className="h-3 w-3" /> Clear filter
            </button>
          )}
        </div>
      )}

      {/* Document Grid — Admin */}
      {activeAdminTab === "all" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {adminCategories.map(({ cat, catDocs }) => {
            const Icon = cat.icon;
            return (
              <div key={cat.id} className={`rounded-2xl border ${cat.borderClass} overflow-hidden`}>
                <div className={`flex items-center justify-between px-5 py-3 ${cat.bgClass}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.colorClass}`} />
                    <p className={`text-xs font-bold ${cat.colorClass}`}>{cat.label}</p>
                    {catDocs.length > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bgClass} ${cat.colorClass} border ${cat.borderClass}`}>
                        {catDocs.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadModal({})}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${cat.colorClass} hover:bg-black/5 transition-colors`}
                  >
                    <Plus className="h-3 w-3" /> Upload
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {catDocs.length > 0 ? (
                    <>
                      {catDocs.slice(0, 5).map((d) => (
                        <DocumentRow key={d.id} doc={d} isAdmin={true} />
                      ))}
                      {catDocs.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setActiveAdminTab(cat.id)}
                          className={`text-[10px] font-semibold ${cat.colorClass} hover:underline`}
                        >
                          +{catDocs.length - 5} more — view all
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <FileText className="h-8 w-8 text-zinc-200 mb-2" />
                      <p className="text-xs text-zinc-400">No {cat.label.toLowerCase()} yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {(() => {
            const { cat, catDocs } = adminCategories.find((c) => c.cat.id === activeAdminTab)!;
            const Icon = cat.icon;
            return (
              <div className={`rounded-2xl border ${cat.borderClass} overflow-hidden`}>
                <div className={`flex items-center justify-between px-5 py-3 ${cat.bgClass}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${cat.colorClass}`} />
                    <p className={`text-xs font-bold ${cat.colorClass}`}>{cat.label}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${cat.bgClass} ${cat.colorClass} border ${cat.borderClass}`}>
                      {catDocs.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadModal({})}
                    className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-semibold ${cat.colorClass} hover:bg-black/5 transition-colors`}
                  >
                    <Plus className="h-3 w-3" /> Upload
                  </button>
                </div>
                <div className="p-4 space-y-2">
                  {catDocs.length > 0 ? (
                    catDocs.map((d) => <DocumentRow key={d.id} doc={d} isAdmin={true} />)
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <FileText className="h-10 w-10 text-zinc-200 mb-3" />
                      <p className="text-sm text-zinc-400">No {cat.label.toLowerCase()} yet</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Upload Modal */}
      {uploadModal && (
        <UploadModal
          defaultTitle={uploadModal.title}
          defaultType={uploadModal.type}
          employees={employees}
          isAdmin={true}
          currentEmployeeId={currentEmployeeId}
          onClose={() => setUploadModal(null)}
          onSuccess={addDoc}
        />
      )}
    </div>
  );
}
