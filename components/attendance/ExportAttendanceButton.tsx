"use client";

import { useState } from "react";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExportAttendanceButton({ spreadsheetId }: { spreadsheetId?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await fetch("/api/attendance/export/sheets", { method: "POST" });
    } catch {
      // ignore fallback
    } finally {
      setLoading(false);
      // Redirect to the "Attendance Logs" worksheet range
      const sheetId = spreadsheetId || "1_tXgE1Hn9i6igZ_lUkMaH3YnX7UM8lHN8AuA";
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=AttendanceLogs`, "_blank");
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      variant="outline"
      className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all duration-300 hover:-translate-y-0.5"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
      )}
      <span>{loading ? "Syncing Sheet..." : "Export Sheets"}</span>
    </Button>
  );
}
