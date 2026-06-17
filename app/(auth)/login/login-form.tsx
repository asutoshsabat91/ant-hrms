"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, Eye, EyeOff, Lock, Mail, AlertCircle } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  personalEmail: z.string().email("Enter a valid personal email"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [registered, setRegistered] = useState<{ email: string; password: string } | null>(null);

  // States for Forgot / Reset Flow
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  async function onLogin(data: LoginData) {
    setLoading(true);
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onRegister(data: RegisterData) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Registration failed.");
        return;
      }
      setRegistered({ email: payload.corporateEmail, password: payload.temporaryPassword });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Please enter your email");
      return;
    }
    setLoading(true);
    setError(null);

    // Simulate OTP generation
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg("Recovery code generated. Use code 123456.");
      setMode("reset");
    }, 1200);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetOtp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          otp: resetOtp.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const payload = await res.json();
      setLoading(false);

      if (!res.ok) {
        setError(payload.error || "Unable to update password.");
        return;
      }

      setSuccessMsg("Password changed successfully! Please login with your new password.");
      setMode("login");
      // Clear fields
      setResetOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setLoading(false);
      setError("An error occurred. Please try again.");
    }
  }

  if (registered) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#10b981]/20 bg-[#10b981]/5 p-6 space-y-4 shadow-[0_4px_30px_rgba(16,185,129,0.1)] backdrop-blur-md">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-[#10b981] shrink-0" />
            <p className="font-extrabold text-white text-lg">Account Created!</p>
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Your AntBox corporate email has been generated. Use these credentials to log in.
          </p>
          <div className="rounded-xl bg-[#09090b]/80 border border-white/10 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Corporate Email</p>
              <p className="text-sm font-semibold text-purple-400 mt-0.5 select-all">{registered.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Temporary Password</p>
              <p className="text-sm font-semibold text-orange-400 mt-0.5 font-mono select-all">{registered.password}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">Please change your password after your first login.</p>
        </div>
        <Button
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.4)]"
          onClick={() => {
            setMode("login");
            setRegistered(null);
          }}
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccessMsg(null);
          }}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
        </button>

        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Create Account</h2>
          <p className="mt-1.5 text-xs text-zinc-400 font-medium leading-relaxed">
            New to AntBox? Provide your details to instantly generate your corporate account.
          </p>
        </div>

        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">First Name</Label>
              <Input
                className="mt-1 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="Riya"
                {...registerForm.register("firstName")}
              />
              {registerForm.formState.errors.firstName && (
                <p className="mt-1 text-[10px] font-bold text-red-400">{registerForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Last Name</Label>
              <Input
                className="mt-1 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="Sharma"
                {...registerForm.register("lastName")}
              />
              {registerForm.formState.errors.lastName && (
                <p className="mt-1 text-[10px] font-bold text-red-400">{registerForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gender</Label>
            <select
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              {...registerForm.register("gender")}
            >
              <option value="" className="bg-zinc-950 text-zinc-400">Select gender…</option>
              <option value="MALE" className="bg-zinc-950 text-white">Male</option>
              <option value="FEMALE" className="bg-zinc-950 text-white">Female</option>
              <option value="OTHER" className="bg-zinc-950 text-white">Other</option>
            </select>
            {registerForm.formState.errors.gender && (
              <p className="mt-1 text-[10px] font-bold text-red-400">{registerForm.formState.errors.gender.message}</p>
            )}
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Personal Email</Label>
            <Input
              type="email"
              className="mt-1 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
              placeholder="you@gmail.com"
              {...registerForm.register("personalEmail")}
            />
            {registerForm.formState.errors.personalEmail && (
              <p className="mt-1 text-[10px] font-bold text-red-400">{registerForm.formState.errors.personalEmail.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone (optional)</Label>
              <Input
                className="mt-1 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="+91 98765..."
                {...registerForm.register("phone")}
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth (optional)</Label>
              <Input
                type="date"
                className="mt-1 bg-zinc-900/60 border-zinc-800 text-white focus:border-purple-500 focus:ring-purple-500/20"
                {...registerForm.register("dateOfBirth")}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)] mt-2"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Generate Corporate Account"}
          </Button>
        </form>
      </div>
    );
  }

  if (mode === "forgot") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setMode("login");
            setError(null);
            setSuccessMsg(null);
          }}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
        </button>

        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Forgot Password</h2>
          <p className="mt-1.5 text-xs text-zinc-400 font-medium leading-relaxed">
            Enter your corporate email address. We will verify and help you change your password.
          </p>
        </div>

        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Corporate Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
              <Input
                type="email"
                required
                className="pl-10 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="you@theantbox.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
            disabled={loading}
          >
            {loading ? "Verifying Account..." : "Send Verification Code"}
          </Button>
        </form>
      </div>
    );
  }

  if (mode === "reset") {
    return (
      <div className="space-y-6">
        <button
          onClick={() => {
            setMode("forgot");
            setError(null);
            setSuccessMsg(null);
          }}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        <div>
          <h2 className="text-2xl font-black text-white tracking-tight font-sans">Change Password</h2>
          <p className="mt-1.5 text-xs text-zinc-400 font-medium leading-relaxed">
            Please verify using the temporary OTP/code sent to <span className="text-purple-400">{forgotEmail}</span>.
          </p>
        </div>

        {successMsg && (
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs font-bold text-purple-300">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verification Code (OTP)</Label>
            <Input
              type="text"
              required
              maxLength={6}
              className="mt-1 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20 font-mono tracking-widest text-center"
              placeholder="123456"
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
              <Input
                type={showNewPassword ? "text" : "password"}
                required
                className="pl-10 pr-10 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-3.5 text-zinc-500 hover:text-white transition-colors"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
              <Input
                type={showNewPassword ? "text" : "password"}
                required
                className="pl-10 pr-10 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
            disabled={loading}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Login Status Indicator */}
      <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">
        <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
        <span>Use Corporate Credentials</span>
      </div>

      <div>
        <h2 className="text-2xl font-black text-white tracking-tight">Sign in</h2>
        <p className="mt-1.5 text-xs text-zinc-400 font-semibold">Welcome back to AntBox People Platform</p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs font-bold text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</Label>
          <div className="relative mt-1">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
            <Input
              id="email"
              type="email"
              className="pl-10 bg-zinc-900/60 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-purple-500/20"
              placeholder="you@theantbox.com"
              {...loginForm.register("email")}
            />
          </div>
          {loginForm.formState.errors.email && (
            <p className="mt-1 text-[10px] font-bold text-red-400">{loginForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</Label>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-[10px] font-bold text-purple-400 hover:text-purple-300 transition-colors uppercase tracking-wider"
            >
              Forgot?
            </button>
          </div>
          <div className="relative mt-1">
            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              className="pl-10 pr-10 bg-zinc-900/60 border-zinc-800 text-white focus:border-purple-500 focus:ring-purple-500/20"
              {...loginForm.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3.5 text-zinc-500 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="mt-1 text-[10px] font-bold text-red-400">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs font-bold text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold h-11 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-zinc-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-zinc-950 px-3 text-zinc-500 font-bold tracking-widest text-[9px]">Or</span>
        </div>
      </div>

      {/* New Joinee CTA */}
      <button
        type="button"
        onClick={() => {
          setMode("register");
          setError(null);
          setSuccessMsg(null);
        }}
        className="w-full rounded-xl border border-dashed border-purple-500/40 bg-purple-500/5 py-3 text-xs font-bold text-purple-400 hover:border-purple-500 hover:bg-purple-500/10 transition-all uppercase tracking-wider"
      >
        New Joinee? Create Account →
      </button>

      <p className="mt-4 text-center text-[10px] font-semibold text-zinc-600">
        Demo: admin@theantbox.com / AntBox@2025 (after seed)
      </p>
    </div>
  );
}
