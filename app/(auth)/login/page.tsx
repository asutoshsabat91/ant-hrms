import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-[var(--brand-secondary)] p-12 text-white lg:flex">
        <div>
          <div className="mb-8 inline-flex items-center justify-center rounded-xl bg-white p-3 shadow-md border border-zinc-150">
            <Image src="/logo.png" alt="AntBox Logo" width={110} height={32} className="object-contain" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">AntBox HRMS</h1>
          <p className="mt-4 max-w-md text-lg text-white/80">
            Bridging academia to SaaS careers — manage your people, onboarding,
            payroll, and culture in one place.
          </p>
        </div>
        <p className="text-sm text-white/60">
          Bhubaneswar, Odisha · people@theantbox.com
        </p>
      </div>

      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <Suspense fallback={<div className="text-sm text-[var(--neutral-600)]">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
