"use client";

import { useState, useRef } from "react";
import { X, Upload, CheckCircle, AlertTriangle, Info, FileSpreadsheet } from "lucide-react";
import { useRouter } from "next/navigation";

interface BiometricImportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BiometricImportModal({ isOpen, onOpenChange }: BiometricImportModalProps) {
  const [activeTab, setActiveTab] = useState<"SHEETS" | "CSV">("SHEETS");
  const [csvText, setCsvText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    importedCount: number;
    duplicateCount: number;
    nonAntboxCount: number;
    invalidCount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleClose = () => {
    setCsvText("");
    setResult(null);
    setErrorMsg(null);
    onOpenChange(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCsvText(text);
        setErrorMsg(null);
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const handleSubmitCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) {
      setErrorMsg("Please paste CSV data or upload a file first.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch("/api/attendance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import attendance data.");
      }

      setResult(data);
      router.refresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during import.";
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSheetsImport = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await fetch("/api/attendance/import/sheets", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import attendance data.");
      }

      setResult(data);
      router.refresh();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "An unexpected error occurred during import.";
      setErrorMsg(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}
        onClick={handleClose}
      />
      {/* Panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#09090b", letterSpacing: "-0.02em" }}>
                Import Biometric Data
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 10, fontWeight: 700, color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Add punches for AntBox deployed employees
              </p>
            </div>
            <button
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
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tab Selectors */}
        {!result && (
          <div className="flex border-b border-zinc-100 mb-4">
            <button
              onClick={() => {
                setActiveTab("SHEETS");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "SHEETS"
                  ? "border-zinc-950 text-zinc-950"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              Google Sheet Import
            </button>
            <button
              onClick={() => {
                setActiveTab("CSV");
                setErrorMsg(null);
              }}
              className={`flex-1 pb-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === "CSV"
                  ? "border-zinc-950 text-zinc-950"
                  : "border-transparent text-zinc-400 hover:text-zinc-600"
              }`}
            >
              CSV / Text Paste
            </button>
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <CheckCircle size={32} className="text-emerald-600 mb-2" />
              <h4 className="text-sm font-bold text-emerald-950">Import Completed Successfully</h4>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">Punch logs have been processed and metrics updated.</p>
            </div>

            <div className="border border-zinc-100 rounded-xl overflow-hidden text-xs">
              <div className="flex justify-between p-2.5 border-b border-zinc-100 bg-zinc-50/50">
                <span className="font-semibold text-zinc-500">New Punches Imported</span>
                <span className="font-bold text-zinc-950">{result.importedCount}</span>
              </div>
              <div className="flex justify-between p-2.5 border-b border-zinc-100">
                <span className="font-semibold text-zinc-500">Duplicate Punches (Skipped)</span>
                <span className="font-bold text-amber-600">{result.duplicateCount}</span>
              </div>
              <div className="flex justify-between p-2.5 border-b border-zinc-100">
                <span className="font-semibold text-zinc-500">Non-AntBox Employees (Ignored)</span>
                <span className="font-bold text-zinc-600">{result.nonAntboxCount}</span>
              </div>
              <div className="flex justify-between p-2.5">
                <span className="font-semibold text-zinc-500">Malformed Rows</span>
                <span className="font-bold text-red-600">{result.invalidCount}</span>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-full py-2 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs rounded-xl transition"
            >
              Done
            </button>
          </div>
        ) : activeTab === "SHEETS" ? (
          <div className="space-y-4">
            <div className="flex gap-2.5 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600 leading-relaxed">
              <Info size={16} className="text-zinc-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-950">Google Sheets Integration:</span>
                <p className="mt-1 text-zinc-500 font-medium">
                  The system will read punches directly from the worksheet tab named <span className="font-bold text-zinc-950">&quot;Biometric Import&quot;</span> in your active Master Google Sheet.
                </p>
                <p className="mt-1.5 text-zinc-500 font-semibold">
                  Required columns: <code className="text-zinc-800 font-bold bg-zinc-100 px-1 rounded">employeeId, punchedAt, punchType</code>
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSheetsImport}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet size={14} />
                {submitting ? "Syncing Sheets..." : "Sync from Google Sheet"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitCsv} className="space-y-4">
            {/* CSV Paste Text Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Paste CSV Contents</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--purple)] hover:underline"
                >
                  <Upload size={10} /> Upload File
                </button>
              </div>
              <textarea
                rows={8}
                placeholder={`employeeId,punchedAt,punchType
ANT001,2026-06-25 09:15:00,IN
ANT001,2026-06-25 18:30:00,OUT`}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                className="w-full border border-zinc-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-zinc-400"
              />
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {errorMsg && (
              <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 font-bold text-xs rounded-xl hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-zinc-900 text-white font-bold text-xs rounded-xl hover:bg-zinc-800 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? "Processing..." : "Import punches"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
