"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficeLocationCard } from "@/components/settings/OfficeLocationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Search } from "lucide-react";

interface SettingsPageClientProps {
  user: {
    email: string;
    role: string;
    employee?: {
      firstName: string;
      lastName: string;
      employeeId: string;
    } | null;
  } | null;
  isSuperAdmin: boolean;
  officeLat: number;
  officeLon: number;
  officeRadius: number;
  employeesForAccess?: Array<{ id: string; name: string; email: string; employeeId: string; userId: string; isActive: boolean }>;
}

export function SettingsPageClient({
  user,
  isSuperAdmin,
  officeLat,
  officeLon,
  officeRadius,
  employeesForAccess,
}: SettingsPageClientProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Access Control state
  const [employeesList, setEmployeesList] = useState(employeesForAccess || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleAccess = async (userId: string, currentStatus: boolean) => {
    setTogglingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/toggle-access`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update user access.");
      } else {
        setEmployeesList((prev) =>
          prev.map((emp) => (emp.userId === userId ? { ...emp, isActive: !currentStatus } : emp))
        );
      }
    } catch {
      alert("Failed to update access.");
    } finally {
      setTogglingId(null);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }
      setSuccessMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Profile Card */}
      <Card className="border border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-950 font-bold text-base">Profile</CardTitle>
          <CardDescription className="text-zinc-500 text-xs">Logged-in account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{user?.email}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Role</p>
            <p className="text-sm font-medium text-zinc-900 mt-0.5">{user?.role?.replace("_", " ")}</p>
          </div>
          {user?.employee && (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Employee</p>
                <p className="text-sm font-medium text-zinc-900 mt-0.5">
                  {user.employee.firstName} {user.employee.lastName}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Employee ID</p>
                <p className="text-sm font-mono font-semibold text-[var(--purple)] mt-0.5">{user.employee.employeeId}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="border border-zinc-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-950 font-bold text-base">Security</CardTitle>
          <CardDescription className="text-zinc-500 text-xs">Update your credentials password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Password</label>
              <Input
                type="password"
                required
                className="mt-1"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">New Password</label>
              <Input
                type="password"
                required
                className="mt-1"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm New Password</label>
              <Input
                type="password"
                required
                className="mt-1"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {errorMsg && (
              <div className="flex gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold">
                <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} size="sm" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold">
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Office Location (Super Admin only) */}
      {isSuperAdmin ? (
        <OfficeLocationCard
          initialLat={officeLat}
          initialLon={officeLon}
          initialRadius={officeRadius}
        />
      ) : (
        <Card className="border border-zinc-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-zinc-950 font-bold text-base">Workspace</CardTitle>
            <CardDescription className="text-zinc-500 text-xs">AntBox HRMS configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">
              Settings are managed by your Super Admin. Contact HR for changes to office policies or account configuration.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Employee Access Control (Super Admin only) */}
      {isSuperAdmin && (
        <Card className="col-span-full border border-zinc-200 shadow-sm mt-4">
          <CardHeader className="pb-3 flex flex-row items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-zinc-950 font-bold text-base">Employee HRMS Access Control</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                Revoke or grant access permissions to individual employee logins. Revoked users will be blocked from logging in.
              </CardDescription>
            </div>
            <div className="relative flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 focus-within:border-zinc-300 transition-colors w-64">
              <Search className="h-3.5 w-3.5 text-zinc-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 outline-none"
              />
            </div>
          </CardHeader>
          <CardContent>
            {employeesList.length > 0 ? (
              <div className="border border-zinc-100 rounded-xl bg-white overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <th className="px-4 py-3">Employee Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3 text-center">Status</th>
                      <th className="px-4 py-3 text-right">Access Permission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 text-xs font-medium text-zinc-700">
                    {employeesList
                      .filter((emp) => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map((emp) => (
                        <tr key={emp.id} className="hover:bg-zinc-50/30">
                          <td className="px-4 py-3 font-semibold text-zinc-900">{emp.name}</td>
                          <td className="px-4 py-3 text-zinc-500">{emp.email}</td>
                          <td className="px-4 py-3 text-zinc-400 font-mono">{emp.employeeId}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              emp.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                            }`}>
                              {emp.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end">
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={emp.isActive}
                                  disabled={togglingId === emp.userId}
                                  onChange={() => handleToggleAccess(emp.userId, emp.isActive)}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-zinc-200 rounded-full peer peer-focus:ring-0 dark:bg-zinc-200 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-950"></div>
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-zinc-400 text-xs">No active employee accounts found.</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
