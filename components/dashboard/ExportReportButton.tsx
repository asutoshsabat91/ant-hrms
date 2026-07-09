"use client";

import { useState } from "react";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportReportButton({ spreadsheetId }: { spreadsheetId?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Trigger background sync to write latest database status into the unified sheet
      await fetch("/api/google/sheets-sync", { method: "POST" });
    } catch {
      // ignore fallback
    } finally {
      setLoading(false);
      // Redirect directly to the live Google Sheets document
      const sheetId = spreadsheetId || "1_tXgE1Hn9i6igZ_lUkMaH3YnX7UM8lHN8AuA";
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank");
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-900 px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
      )}
      <span>{loading ? "Syncing Sheet..." : "Export report"}</span>
    </Button>
  );
}
