"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OfficeLocationCard } from "@/components/settings/OfficeLocationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

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
}

export function SettingsPageClient({
  user,
  isSuperAdmin,
  officeLat,
  officeLon,
  officeRadius,
}: SettingsPageClientProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    </div>
  );
}
