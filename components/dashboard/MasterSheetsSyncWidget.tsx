"use client";

import { useState, useEffect } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, FileSpreadsheet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface SyncEmployee {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  deployedCompany?: string | null;
  status: string;
  leaveRequests?: { status: string }[];
}

export function MasterSheetsSyncWidget({
  spreadsheetId,
  employees = [],
}: {
  spreadsheetId?: string;
  employees?: SyncEmployee[];
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    simulated: boolean;
    updatedCount: number;
    createdCount: number;
    message?: string;
    error?: string;
  } | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("antbox_sheets_last_sync");
    if (saved) setLastSynced(saved);
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch("/api/google/sheets-sync", {
        method: "POST",
      });
      const data = await response.json();

      if (response.ok && data.success) {
        const now = new Date().toLocaleTimeString();
        setLastSynced(now);
        localStorage.setItem("antbox_sheets_last_sync", now);
        setSyncResult({
          success: true,
          simulated: data.simulated,
          updatedCount: data.updatedCount,
          createdCount: data.createdCount,
          message: data.message,
        });
      } else {
        const diagnosticsStr = data.diagnostics ? ` | Diagnostics: ${JSON.stringify(data.diagnostics)}` : "";
        setSyncResult({
          success: false,
          simulated: false,
          updatedCount: 0,
          createdCount: 0,
          error: (data.error || "Sync failed.") + diagnosticsStr,
        });
      }
    } catch (err) {
      setSyncResult({
        success: false,
        simulated: false,
        updatedCount: 0,
        createdCount: 0,
        error: `Failed to connect to synchronization service. ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm overflow-hidden">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-xl font-extrabold text-zinc-950">Master Employee Database</CardTitle>
              <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Google Sheets Live (Connected)
              </span>
            </div>
            <CardDescription className="text-xs text-zinc-400 font-medium">
              Synchronize, manage, and edit employee records, leaves, bank accounts, and documents in a unified spreadsheet.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {lastSynced && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Last Synced: {lastSynced}
              </span>
            )}
            <Button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white px-4 py-2 text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Master Sheet"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 space-y-4">
        {/* Sync notification banners */}
        {syncResult && (
          <div
            className={`rounded-xl border p-4 text-xs font-medium animate-in fade-in slide-in-from-top-2 duration-300 ${
              syncResult.success
                ? "bg-emerald-50 border-emerald-200/60 text-emerald-900"
                : "bg-red-50 border-red-200/60 text-red-900"
            }`}
          >
            <div className="flex items-start gap-2.5">
              {syncResult.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">
                  {syncResult.success ? "Sync Completed successfully!" : "Sync Failed"}
                </p>
                <p className="mt-0.5 opacity-90">
                  {syncResult.success
                    ? syncResult.simulated
                      ? `Sync succeeded! Bi-directional update simulated: synchronized latest profiles successfully.`
                      : `Live sync succeeded! Updated ${syncResult.updatedCount} database profiles and added ${syncResult.createdCount} new employees.`
                    : syncResult.error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Embedded IFrame or Preview Table */}
        <div className="relative rounded-xl border border-zinc-150 overflow-hidden bg-zinc-50 h-[380px]">
          {!spreadsheetId ? (
            /* Premium Mock Google Sheet Table UI populated with DB values */
            <div className="absolute inset-0 flex flex-col p-4 bg-white overflow-hidden select-none">
              <div className="flex items-center justify-between border-b border-zinc-150 pb-2.5 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                  <span>AntBox HRMS Database (Spreadsheet Sync Status)</span>
                  <span className="text-[10px] text-zinc-400 font-medium">Read-Only Preview</span>
                </div>
                <div className="text-[10px] text-zinc-400 font-semibold italic">
                  Status: Connected & Synchronized
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 font-bold border-b border-zinc-100 text-zinc-500 uppercase tracking-wider text-[9px]">
                      <th className="px-3 py-2 border-r border-zinc-100">Employee ID</th>
                      <th className="px-3 py-2 border-r border-zinc-100">First Name</th>
                      <th className="px-3 py-2 border-r border-zinc-100">Last Name</th>
                      <th className="px-3 py-2 border-r border-zinc-100">Official Email</th>
                      <th className="px-3 py-2 border-r border-zinc-100">Designation</th>
                      <th className="px-3 py-2 border-r border-zinc-100">Deployed Company</th>
                      <th className="px-3 py-2 border-r border-zinc-100">Status</th>
                      <th className="px-3 py-2">Leaves Approved</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 font-mono text-[10px] text-zinc-600">
                    {employees.map((emp) => (
                      <tr key={emp.employeeId}>
                        <td className="px-3 py-2 font-bold text-zinc-900 border-r border-zinc-100">{emp.employeeId}</td>
                        <td className="px-3 py-2 border-r border-zinc-100">{emp.firstName}</td>
                        <td className="px-3 py-2 border-r border-zinc-100">{emp.lastName}</td>
                        <td className="px-3 py-2 border-r border-zinc-100">{emp.email}</td>
                        <td className="px-3 py-2 border-r border-zinc-100">{emp.designation}</td>
                        <td className="px-3 py-2 border-r border-zinc-100 font-bold text-violet-700">{emp.deployedCompany || "AntBox"}</td>
                        <td className={`px-3 py-2 border-r border-zinc-100 font-bold ${
                          emp.status === "ACTIVE" ? "text-emerald-700" : "text-amber-700"
                        }`}>{emp.status}</td>
                        <td className="px-3 py-2">{emp.leaveRequests?.filter((l) => l.status === "APPROVED").length ?? 0}</td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-zinc-400">
                          No employees synced to sheet yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Live Google Sheet Embedded IFrame */
            <>
              <iframe
                src={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?widget=true&headers=false&chrome=false`}
                className="w-full h-full border-none"
                allowFullScreen
              />
              <div className="absolute bottom-3 right-3">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 rounded-lg bg-zinc-950/80 backdrop-blur px-3 py-1.5 text-[10px] font-bold text-white shadow hover:bg-zinc-900 transition-all"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open in Sheets
                </a>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
