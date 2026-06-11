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
import { CheckCircle2, ArrowLeft } from "lucide-react";

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
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState<{ email: string; password: string } | null>(null);

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
    if (result?.error) { setError("Invalid email or password"); return; }
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
      if (!res.ok) { setError(payload.error || "Registration failed."); return; }
      setRegistered({ email: payload.corporateEmail, password: payload.temporaryPassword });
    } catch { setError("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  if (registered) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
            <p className="font-bold text-emerald-900 text-lg">Account Created!</p>
          </div>
          <p className="text-sm text-emerald-800">Your AntBox corporate email has been generated. Use these credentials to log in and start your onboarding.</p>
          <div className="rounded-xl bg-white border border-emerald-200 p-4 space-y-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Corporate Email</p>
              <p className="text-sm font-semibold text-zinc-900 mt-0.5">{registered.email}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Temporary Password</p>
              <p className="text-sm font-semibold text-zinc-900 mt-0.5 font-mono">{registered.password}</p>
            </div>
          </div>
          <p className="text-xs text-emerald-700">Please change your password after first login.</p>
        </div>
        <Button className="w-full" onClick={() => { setMode("login"); setRegistered(null); }}>
          Proceed to Login
        </Button>
      </div>
    );
  }

  if (mode === "register") {
    return (
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={() => { setMode("login"); setError(null); }}
          className="mb-4 flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Sign In
        </button>

        <h2 className="text-2xl font-semibold text-[var(--brand-secondary)]">Create Account</h2>
        <p className="mt-2 text-sm text-[var(--neutral-600)]">New to AntBox? Fill in your details and we&apos;ll generate your corporate email.</p>

        <form onSubmit={registerForm.handleSubmit(onRegister)} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name</Label>
              <Input className="mt-1" placeholder="Riya" {...registerForm.register("firstName")} />
              {registerForm.formState.errors.firstName && (
                <p className="mt-1 text-xs text-[var(--danger)]">{registerForm.formState.errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label>Last Name</Label>
              <Input className="mt-1" placeholder="Sharma" {...registerForm.register("lastName")} />
              {registerForm.formState.errors.lastName && (
                <p className="mt-1 text-xs text-[var(--danger)]">{registerForm.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label>Gender</Label>
            <select
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--purple)]/30"
              {...registerForm.register("gender")}
            >
              <option value="">Select gender…</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
            {registerForm.formState.errors.gender && (
              <p className="mt-1 text-xs text-[var(--danger)]">{registerForm.formState.errors.gender.message}</p>
            )}
          </div>

          <div>
            <Label>Personal Email</Label>
            <Input type="email" className="mt-1" placeholder="you@gmail.com" {...registerForm.register("personalEmail")} />
            {registerForm.formState.errors.personalEmail && (
              <p className="mt-1 text-xs text-[var(--danger)]">{registerForm.formState.errors.personalEmail.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Phone (optional)</Label>
              <Input className="mt-1" placeholder="+91 98765..." {...registerForm.register("phone")} />
            </div>
            <div>
              <Label>Date of Birth (optional)</Label>
              <Input type="date" className="mt-1" {...registerForm.register("dateOfBirth")} />
            </div>
          </div>

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account…" : "Generate My Corporate Email"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">✓ Google login enabled</p>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">ℹ Google login disabled</p>
          <p className="text-xs text-amber-700">Use email/password to sign in</p>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-[var(--brand-secondary)]">Sign in</h2>
      <p className="mt-2 text-sm text-[var(--neutral-600)]">Welcome back to AntBox People Platform</p>

      <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="mt-1" placeholder="you@theantbox.com" {...loginForm.register("email")} />
          {loginForm.formState.errors.email && (
            <p className="mt-1 text-xs text-[var(--danger)]">{loginForm.formState.errors.email.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" className="mt-1" {...loginForm.register("password")} />
          {loginForm.formState.errors.password && (
            <p className="mt-1 text-xs text-[var(--danger)]">{loginForm.formState.errors.password.message}</p>
          )}
        </div>
        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)]" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--card-border)]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-[var(--neutral-400)]">Or</span>
        </div>
      </div>

      {/* New Joinee CTA */}
      <button
        type="button"
        onClick={() => { setMode("register"); setError(null); }}
        className="w-full rounded-xl border-2 border-dashed border-[var(--purple)]/30 bg-[var(--purple)]/5 py-3 text-sm font-semibold text-[var(--purple)] hover:border-[var(--purple)]/60 hover:bg-[var(--purple)]/10 transition-all"
      >
        New Joinee? Create Account →
      </button>

      <p className="mt-6 text-center text-xs text-[var(--neutral-600)]">
        Demo: admin@theantbox.com / AntBox@2025 (after seed)
      </p>
    </div>
  );
}
