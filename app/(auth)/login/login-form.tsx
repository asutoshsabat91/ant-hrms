"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ArrowLeft, Eye, EyeOff, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"] as const),
  phone: z.string().optional(),
  dateOfBirth: z.string().min(1, "Birth Date is required").refine((val) => {
    if (!val) return false;
    const dob = new Date(val);
    const today = new Date();
    const ageLimit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    return dob <= ageLimit;
  }, { message: "You must be at least 18 years old" }),
  personalEmail: z.string()
    .email("Enter a valid personal email")
    .refine((val) => val.toLowerCase().endsWith("@gmail.com"), {
      message: "Personal email must be a Gmail address ending with @gmail.com",
    }),
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
  const [registered, setRegistered] = useState<{ pending: boolean; personalEmail: string } | null>(null);

  // States for Forgot / Reset Flow
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // States for Registration OTP Flow
  const [registerOtp, setRegisterOtp] = useState("");
  const [registerOtpSent, setRegisterOtpSent] = useState(false);
  const [sendingRegisterOtp, setSendingRegisterOtp] = useState(false);
  const [registerSuccessMsg, setRegisterSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError) {
      if (authError === "AccessDenied") {
        setError("Access Denied: Only corporate email accounts ending with @theantbox.com are allowed to sign in.");
      } else {
        setError(`Authentication failed: ${authError}`);
      }
      // Clean up the URL parameter cleanly without reloading the page
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams]);

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

  async function sendRegisterOtp() {
    const personalEmail = registerForm.getValues("personalEmail");
    if (!personalEmail) {
      setError("Please enter your personal email address first.");
      return;
    }
    if (!personalEmail.toLowerCase().endsWith("@gmail.com")) {
      setError("Please enter a valid Gmail address (ending with @gmail.com).");
      return;
    }

    setSendingRegisterOtp(true);
    setError(null);
    setRegisterSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personalEmail: personalEmail.trim() })
      });
      const data = await res.json();
      setSendingRegisterOtp(false);
      if (!res.ok) {
        setError(data.error || "Failed to send verification code.");
        return;
      }
      setRegisterOtpSent(true);
      if (data.simulated && data.otp) {
        setRegisterSuccessMsg(`[Simulation Mode] OTP code generated: ${data.otp}`);
      } else {
        setRegisterSuccessMsg(`Verification OTP code sent successfully to ${personalEmail}. Check inbox/spam.`);
      }
    } catch {
      setSendingRegisterOtp(false);
      setError("An unexpected error occurred. Please try again.");
    }
  }

  async function onRegister(data: RegisterData) {
    if (!registerOtp.trim()) {
      setError("Please verify your Gmail address using the OTP first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, otp: registerOtp.trim() }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Registration failed.");
        return;
      }
      setRegistered({ pending: true, personalEmail: data.personalEmail });
      // Reset otp fields
      setRegisterOtp("");
      setRegisterOtpSent(false);
      setRegisterSuccessMsg(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Please enter your email or name");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const payload = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(payload.error || "Failed to generate recovery code.");
        return;
      }
      if (payload.otp) {
        setSuccessMsg(`[Simulation Mode] OTP code generated: ${payload.otp} for ${payload.email || forgotEmail}`);
      } else {
        setSuccessMsg(`Verification code sent to ${payload.email || forgotEmail} successfully. Check inbox/spam.`);
      }
      if (payload.email) {
        setForgotEmail(payload.email);
      }
      setMode("reset");
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
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

      setSuccessMsg("Password changed successfully! Please sign in with your new password.");
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

  if (registered && registered.pending) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <p className="font-extrabold text-zinc-900 text-lg">Registration Submitted!</p>
          </div>
          <p className="text-sm text-zinc-600 leading-relaxed font-medium">
            Your details have been submitted to the Superadmin for approval.
          </p>
          <div className="rounded-xl bg-white border border-zinc-200 p-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Personal Email</p>
              <p className="text-sm font-semibold text-[#8e43ac] mt-0.5 select-all">{registered.personalEmail}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Status</p>
              <p className="text-sm font-semibold text-amber-600 mt-0.5 uppercase tracking-wide">Pending Approval</p>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
            Once approved by the admin, your official corporate email account will be generated and a welcome message containing your login credentials will be sent to your personal email address.
          </p>
        </div>
        <Button
          className="w-full bg-[#8e43ac] hover:bg-[#703387] text-white font-bold h-11 rounded-xl transition-all"
          onClick={() => {
            setMode("login");
            setRegistered(null);
          }}
        >
          Back to Login
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
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
        </button>

        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Create Account</h2>
          <p className="mt-1.5 text-xs text-zinc-500 font-medium leading-relaxed">
            New to AntBox? Provide your details to request your corporate account.
          </p>
        </div>

        <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">First Name</Label>
              <input
                className="mt-1 w-full h-11 px-3.5 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all"
                placeholder="Riya"
                {...registerForm.register("firstName")}
              />
              {registerForm.formState.errors.firstName && (
                <p className="mt-1 text-[10px] font-bold text-red-600">{registerForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Last Name</Label>
              <input
                className="mt-1 w-full h-11 px-3.5 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all"
                placeholder="Sharma"
                {...registerForm.register("lastName")}
              />
              {registerForm.formState.errors.lastName && (
                <p className="mt-1 text-[10px] font-bold text-red-600">{registerForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Gender</Label>
            <select
              className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 bg-white text-sm text-zinc-900 outline-none focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20"
              {...registerForm.register("gender")}
            >
              <option value="" className="text-zinc-400">Select gender…</option>
              <option value="MALE" className="text-zinc-900">Male</option>
              <option value="FEMALE" className="text-zinc-900">Female</option>
              <option value="OTHER" className="text-zinc-900">Other</option>
            </select>
            {registerForm.formState.errors.gender && (
              <p className="mt-1 text-[10px] font-bold text-red-600">{registerForm.formState.errors.gender.message}</p>
            )}
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Personal Gmail Address</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <input
                  type="email"
                  className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
                  placeholder="you@gmail.com"
                  {...registerForm.register("personalEmail")}
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              </div>
              <Button
                type="button"
                onClick={sendRegisterOtp}
                disabled={sendingRegisterOtp}
                className="bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-bold px-4 rounded-xl text-xs flex items-center gap-1.5 h-11 shadow-sm"
              >
                {sendingRegisterOtp ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#8e43ac]" />
                ) : (
                  "Verify Gmail"
                )}
              </Button>
            </div>
            {registerForm.formState.errors.personalEmail && (
              <p className="mt-1 text-[10px] font-bold text-red-600">{registerForm.formState.errors.personalEmail.message}</p>
            )}
          </div>

          {registerSuccessMsg && (
            <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs font-bold text-[#8e43ac] leading-relaxed">
              {registerSuccessMsg}
            </div>
          )}

          {registerOtpSent && (
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Verification Code (OTP)</Label>
              <input
                type="text"
                required
                maxLength={6}
                className="mt-1 w-full h-11 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-mono tracking-widest text-center font-bold transition-all text-center"
                placeholder="123456"
                value={registerOtp}
                onChange={(e) => setRegisterOtp(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone (optional)</Label>
              <input
                className="mt-1 w-full h-11 px-3.5 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all"
                placeholder="+91 98765..."
                {...registerForm.register("phone")}
              />
            </div>
            <div>
              <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Date of Birth</Label>
              <input
                type="date"
                className="mt-1 w-full h-11 px-3.5 bg-white border border-zinc-200 text-zinc-950 focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all"
                {...registerForm.register("dateOfBirth")}
              />
              {registerForm.formState.errors.dateOfBirth && (
                <p className="mt-1 text-[10px] font-bold text-red-600">{registerForm.formState.errors.dateOfBirth.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#8e43ac] hover:bg-[#703387] text-white font-bold h-11 rounded-xl transition-all mt-2"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Submit Details for Approval"}
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
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back to Sign In
        </button>

        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Forgot Password</h2>
          <p className="mt-1.5 text-xs text-zinc-500 font-medium leading-relaxed">
            Enter your corporate email address or name. We will verify and help you change your password.
          </p>
        </div>

        <form onSubmit={handleForgot} className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Corporate Email or Name</Label>
            <div className="relative mt-1">
              <input
                type="text"
                required
                className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
                placeholder="you@theantbox.com or name"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#8e43ac] hover:bg-[#703387] text-white font-bold h-11 rounded-xl transition-all"
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
          className="group inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>

        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Change Password</h2>
          <p className="mt-1.5 text-xs text-zinc-500 font-medium leading-relaxed">
            Please verify using the temporary OTP/code sent to <span className="text-[#8e43ac] font-semibold">{forgotEmail}</span>.
          </p>
        </div>

        {successMsg && (
          <div className="rounded-xl bg-purple-50 border border-purple-200 p-3 text-xs font-bold text-[#8e43ac] leading-relaxed">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Verification Code (OTP)</Label>
            <input
              type="text"
              required
              maxLength={6}
              className="mt-1 w-full h-11 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-mono tracking-widest text-center font-bold transition-all"
              placeholder="123456"
              value={resetOtp}
              onChange={(e) => setResetOtp(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">New Password</Label>
            <div className="relative mt-1">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[#8e43ac] transition-colors z-20"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Confirm New Password</Label>
            <div className="relative mt-1">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[#8e43ac] hover:bg-[#703387] text-white font-bold h-11 rounded-xl transition-all"
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
      <div>
        <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Sign in</h2>
        <p className="mt-1.5 text-xs text-zinc-500 font-medium">Welcome back to AntBox People Platform</p>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</Label>
          <div className="relative mt-1">
            <input
              id="email"
              type="email"
              className="w-full h-11 pl-10 pr-4 bg-white border border-zinc-200 text-zinc-900 placeholder-zinc-400 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
              placeholder="you@theantbox.com"
              {...loginForm.register("email")}
            />
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
          </div>
          {loginForm.formState.errors.email && (
            <p className="mt-1 text-[10px] font-bold text-red-600">{loginForm.formState.errors.email.message}</p>
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
              className="text-[10px] font-bold text-[#8e43ac] hover:text-[#703387] transition-colors uppercase tracking-wider"
            >
              Forgot?
            </button>
          </div>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="w-full h-11 pl-10 pr-10 bg-white border border-zinc-200 text-zinc-900 rounded-xl focus:border-[#8e43ac] focus:ring-2 focus:ring-[#8e43ac]/20 outline-none text-sm font-medium transition-all relative z-0"
              {...loginForm.register("password")}
            />
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none z-10" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950 transition-colors z-20"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="mt-1 text-[10px] font-bold text-red-600">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-[#8e43ac] hover:bg-[#703387] text-white font-bold h-11 rounded-xl transition-all"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-zinc-400 font-extrabold tracking-wider text-[8px]">Or</span>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 font-bold h-11 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <svg className="h-4 w-4 animate-none" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.77c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          <span>Sign in with Google</span>
        </Button>
      </form>
    </div>
  );
}
