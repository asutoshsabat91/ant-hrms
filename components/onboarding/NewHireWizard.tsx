"use client";

import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, CheckCircle2, Camera } from "lucide-react";
import Image from "next/image";

const wizardSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  personalEmail: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  profilePhoto: z.string().optional(),
  designation: z.string().min(1, "Required"),
  departmentId: z.string().min(1, "Required"),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"]),
  joiningDate: z.string().min(1, "Required"),
  ctc: z.number().min(0).optional(),
  variablePay: z.number().min(0).optional(),
  templateId: z.string().optional(),
});

type FormValues = z.infer<typeof wizardSchema>;

type DepartmentOption = { id: string; name: string };
type ManagerOption = { id: string; firstName: string; lastName: string };
type TemplateOption = { id: string; name: string; description?: string | null };

interface NewHireWizardProps {
  departments: DepartmentOption[];
  managers: ManagerOption[];
  templates: TemplateOption[];
}

const STEPS = [
  { num: 1, label: "Personal" },
  { num: 2, label: "Job Role" },
  { num: 3, label: "Salary" },
  { num: 4, label: "Workflow" },
  { num: 5, label: "Review" },
];

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function NewHireWizard({ departments, managers, templates }: NewHireWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ name: string; id: string; hireId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [sameAddress, setSameAddress] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      employmentType: "INTERN",
      templateId: templates[0]?.id ?? "",
      joiningDate: new Date().toISOString().slice(0, 10),
      state: "Odisha",
    },
  });

  const ctc = watch("ctc") || 0;
  const employmentType = watch("employmentType");
  const isIntern = employmentType === "INTERN";

  const compensation = useMemo(() => {
    if (!ctc || ctc <= 0) return null;
    return breakdownFromCTC(ctc, employmentType as "FULL_TIME" | "PART_TIME" | "INTERN" | "CONTRACT");
  }, [ctc, employmentType]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload a JPG/PNG image."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setValue("profilePhoto", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleNext = async () => {
    const fieldsMap: Record<number, (keyof FormValues)[]> = {
      1: ["firstName", "lastName", "email"],
      2: ["designation", "departmentId", "joiningDate"],
      3: [],
      4: [],
    };
    const isValid = await trigger(fieldsMap[step] ?? []);
    if (isValid) setStep((s) => Math.min(5, s + 1));
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/onboarding/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await res.json();
      if (!res.ok) {
        setErrorMessage(typeof payload.error === "string" ? payload.error : JSON.stringify(payload.error));
        return;
      }
      setSuccessData({
        name: `${payload.employee.firstName} ${payload.employee.lastName}`,
        id: payload.employee.employeeId,
        hireId: payload.employee.id,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputCls = "mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm w-full";
  const selectCls = "mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-md">
      {/* Step header */}
      <div className="mb-10">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-950">New Hire Onboarding</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Add a new teammate and configure their workspace.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-full">
            Step {step} of 5
          </span>
        </div>
        <div className="relative mt-8 flex justify-between items-center px-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-100 -translate-y-1/2 z-0" />
          <div className="absolute top-1/2 left-0 h-0.5 bg-zinc-950 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }} />
          {STEPS.map((s) => {
            const done = step > s.num; const active = step === s.num;
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${done ? "bg-zinc-950 text-white" : active ? "bg-white border-2 border-zinc-950 text-zinc-950 scale-110 shadow-sm" : "bg-zinc-50 border border-zinc-200 text-zinc-400"}`}>
                  {done ? "✓" : s.num}
                </div>
                <span className={`absolute top-8 text-[10px] font-bold whitespace-nowrap uppercase ${active ? "text-zinc-900" : "text-zinc-400"}`}>{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">

        {/* ── STEP 1: PERSONAL ─────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Passport photo */}
            <div className="flex items-start gap-5">
              <div
                className="relative flex h-24 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-[var(--purple)]/40 hover:bg-[var(--purple)]/5 transition-all overflow-hidden"
                onClick={() => photoInputRef.current?.click()}
              >
                {photoPreview ? (
                  <Image src={photoPreview} alt="Passport photo" fill className="object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-5 w-5 text-zinc-400" />
                    <span className="text-[9px] font-semibold text-zinc-400 text-center leading-tight">Passport<br/>Photo</span>
                  </div>
                )}
                <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handlePhotoUpload} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-zinc-700">Passport Size Photo <span className="text-rose-500">*</span></p>
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                  Required for compliance and ID card. Upload a clear face photo in JPG/PNG format (max 2MB). This is saved permanently in the company database.
                </p>
                <button type="button" onClick={() => photoInputRef.current?.click()} className="mt-2 flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-zinc-600 hover:border-[var(--purple)]/40 hover:text-[var(--purple)] transition-colors">
                  <Upload className="h-3 w-3" />{photoPreview ? "Change Photo" : "Upload Photo"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FieldGroup label="First Name *">
                <Input className={inputCls} {...register("firstName")} placeholder="Riya" />
                {errors.firstName && <p className="mt-1 text-[10px] text-rose-600">{errors.firstName.message}</p>}
              </FieldGroup>
              <FieldGroup label="Last Name *">
                <Input className={inputCls} {...register("lastName")} placeholder="Sharma" />
                {errors.lastName && <p className="mt-1 text-[10px] text-rose-600">{errors.lastName.message}</p>}
              </FieldGroup>
              <FieldGroup label="Company Email *">
                <Input type="email" className={inputCls} {...register("email")} placeholder="riya.sharma@theantbox.com" />
                {errors.email && <p className="mt-1 text-[10px] text-rose-600">{errors.email.message}</p>}
              </FieldGroup>
              <FieldGroup label="Personal Email">
                <Input type="email" className={inputCls} {...register("personalEmail")} placeholder="you@gmail.com" />
              </FieldGroup>
              <FieldGroup label="Phone (+91)">
                <div className="flex mt-1">
                  <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">+91</span>
                  <Input className="rounded-l-none rounded-r-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 outline-none focus-visible:ring-zinc-950 shadow-sm flex-1 mt-0" {...register("phone")} placeholder="9876543210" />
                </div>
              </FieldGroup>
              <FieldGroup label="Date of Birth">
                <Input type="date" className={inputCls} {...register("dateOfBirth")} />
              </FieldGroup>
              <FieldGroup label="Gender">
                <select className={selectCls} {...register("gender")}>
                  <option value="">Select</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Non-binary / Other</option>
                  <option value="PREFER_NOT">Prefer not to say</option>
                </select>
              </FieldGroup>
              <FieldGroup label="Blood Group">
                <select className={selectCls} {...register("bloodGroup")}>
                  <option value="">Select</option>
                  {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map((bg) => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </FieldGroup>
            </div>

            {/* Addresses */}
            <div className="space-y-3">
              <FieldGroup label="Current Address">
                <Textarea rows={2} className={inputCls + " resize-none"} {...register("currentAddress")} placeholder="Flat/House No., Street, Area…" />
              </FieldGroup>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="sameAddr" checked={sameAddress} onChange={(e) => {
                  setSameAddress(e.target.checked);
                  if (e.target.checked) setValue("permanentAddress", getValues("currentAddress"));
                }} className="rounded" />
                <label htmlFor="sameAddr" className="text-xs text-zinc-500 font-medium">Permanent address same as current</label>
              </div>
              {!sameAddress && (
                <FieldGroup label="Permanent Address">
                  <Textarea rows={2} className={inputCls + " resize-none"} {...register("permanentAddress")} placeholder="Permanent address…" />
                </FieldGroup>
              )}
              <div className="grid grid-cols-3 gap-3">
                <FieldGroup label="City">
                  <Input className={inputCls} {...register("city")} placeholder="Bhubaneswar" />
                </FieldGroup>
                <FieldGroup label="State">
                  <Input className={inputCls} {...register("state")} placeholder="Odisha" />
                </FieldGroup>
                <FieldGroup label="Pincode">
                  <Input className={inputCls} {...register("pincode")} placeholder="751001" />
                  {errors.pincode && <p className="mt-1 text-[10px] text-rose-600">{errors.pincode.message}</p>}
                </FieldGroup>
              </div>
            </div>

            {/* Emergency contact */}
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Emergency Contact</p>
              <div className="grid gap-3 md:grid-cols-2">
                <FieldGroup label="Contact Name">
                  <Input className={inputCls} {...register("emergencyContact")} placeholder="Parent / Guardian name" />
                </FieldGroup>
                <FieldGroup label="Contact Phone (+91)">
                  <div className="flex mt-1">
                    <span className="flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">+91</span>
                    <Input className="rounded-l-none rounded-r-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none shadow-sm flex-1 mt-0" {...register("emergencyPhone")} placeholder="9876543210" />
                  </div>
                </FieldGroup>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: JOB ROLE ─────────────────────────────── */}
        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <FieldGroup label="Designation *">
              <Input className={inputCls} {...register("designation")} placeholder="e.g. Software Engineer Intern" />
              {errors.designation && <p className="mt-1 text-[10px] text-rose-600">{errors.designation.message}</p>}
            </FieldGroup>
            <FieldGroup label="Department *">
              <select className={selectCls} {...register("departmentId")}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className="mt-1 text-[10px] text-rose-600">{errors.departmentId.message}</p>}
            </FieldGroup>
            <FieldGroup label="Manager">
              <select className={selectCls} {...register("managerId")}>
                <option value="">No manager</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="Employment Type">
              <select className={selectCls} {...register("employmentType")}>
                <option value="INTERN">Intern</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </FieldGroup>
            <FieldGroup label="Joining Date *">
              <Input type="date" className={inputCls} {...register("joiningDate")} />
            </FieldGroup>
            <FieldGroup label={isIntern ? "Monthly Stipend (₹)" : "Annual CTC (₹)"}>
              <Input type="number" step="1000" className={inputCls} {...register("ctc", { valueAsNumber: true })} placeholder={isIntern ? "15000" : "500000"} />
            </FieldGroup>
          </div>
        )}

        {/* ── STEP 3: SALARY ───────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <div className="flex-1">
                <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{isIntern ? "Monthly Stipend (₹)" : "Annual CTC (₹)"}</Label>
                <Input type="number" step="1000" className={inputCls + " mt-1"} {...register("ctc", { valueAsNumber: true })} />
                <p className="text-[10px] text-zinc-400 mt-1">
                  {isIntern ? "Full stipend is paid monthly. No HRA or Special Allowance for interns." : "Compensation is split as Basic (50%) + HRA (20%) + Special Allowance (30%) — paid monthly."}
                </p>
              </div>
              {isIntern && (
                <div className="rounded-lg bg-sky-50 border border-sky-100 px-3 py-2 text-[10px] text-sky-700 font-semibold mt-6">
                  Intern — stipend only
                </div>
              )}
            </div>

            {/* Salary breakdown cards */}
            <div className={`grid gap-4 ${isIntern ? "sm:grid-cols-1 max-w-xs" : "sm:grid-cols-3"}`}>
              <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Basic Salary</p>
                <p className="mt-2 text-2xl font-extrabold text-zinc-900">₹{(compensation?.basicSalary ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] text-zinc-400 mt-1 block">{isIntern ? "100% of stipend" : "50% of annual CTC"} / month</span>
              </div>
              {!isIntern && (
                <>
                  <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">HRA</p>
                    <p className="mt-2 text-2xl font-extrabold text-zinc-900">₹{(compensation?.hra ?? 0).toLocaleString("en-IN")}</p>
                    <span className="text-[9px] text-zinc-400 mt-1 block">20% of annual CTC / month</span>
                  </div>
                  <div className="rounded-xl border border-zinc-100 bg-white p-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Special Allowance</p>
                    <p className="mt-2 text-2xl font-extrabold text-zinc-900">₹{(compensation?.specialAllowance ?? 0).toLocaleString("en-IN")}</p>
                    <span className="text-[9px] text-zinc-400 mt-1 block">30% of annual CTC / month</span>
                  </div>
                </>
              )}
            </div>

            {/* Monthly total + Variables */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-100">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Monthly Gross Pay</p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-800">₹{(compensation?.monthly ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] text-emerald-600 mt-1 block">Paid every month to the employee</span>
              </div>
              {!isIntern && (
                <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Variable Pay</p>
                  <Input
                    type="number"
                    step="1000"
                    className="mt-2 rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-medium text-violet-900 outline-none w-full"
                    {...register("variablePay", { valueAsNumber: true })}
                    placeholder="Annual variable (₹)"
                  />
                  <span className="text-[9px] text-violet-500 mt-1 block">Awarded annually — not CTC-based. Leave blank if not applicable.</span>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-zinc-50 border border-zinc-100 p-3 text-[10px] text-zinc-500">
              <strong className="text-zinc-700">Note:</strong> There is no PF deduction per company policy. Salary is credited as gross monthly pay. TDS/taxes are handled separately by the employee.
            </div>
          </div>
        )}

        {/* ── STEP 4: WORKFLOW ─────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-4">
            <FieldGroup label="Onboarding Template">
              <select className={selectCls} {...register("templateId")}>
                {templates.length > 0
                  ? templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)
                  : <option value="">Default template (built-in)</option>
                }
              </select>
            </FieldGroup>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Onboarding Milestones</p>
              {[
                { n: 1, title: "Documents", desc: "ID Proof (Aadhaar, PAN), Degree & Experience Certificates" },
                { n: 2, title: "Banking Details", desc: "Bank account details for payroll processing" },
                { n: 3, title: "ID Card Form", desc: "Employee ID card information — Spotify, emergency contacts, blood group" },
              ].map((m) => (
                <div key={m.n} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-bold shrink-0 mt-0.5">{m.n}</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-800">{m.title}</p>
                    <p className="text-[10px] text-zinc-400">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 5: REVIEW ───────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-6 space-y-4">
              <div className="flex items-center gap-4">
                {photoPreview ? (
                  <div className="relative h-14 w-12 rounded-xl overflow-hidden border border-zinc-200 shadow-sm shrink-0">
                    <Image src={photoPreview} alt="Photo" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-200 text-zinc-500 text-xs font-bold">
                    {watch("firstName")?.[0]}{watch("lastName")?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-bold text-zinc-900">{watch("firstName")} {watch("lastName")}</p>
                  <p className="text-xs text-zinc-400">{watch("designation")} · {watch("employmentType")?.replace("_", " ")}</p>
                </div>
              </div>

              <div className="grid gap-2 text-xs border-t border-zinc-100 pt-4">
                {[
                  ["Company Email", watch("email")],
                  ["Joining Date", watch("joiningDate")],
                  ["Monthly Pay", `₹${(compensation?.monthly ?? 0).toLocaleString("en-IN")}`],
                  ["Photo", photoPreview ? "✓ Uploaded" : "⚠ Not uploaded (required for compliance)"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-zinc-400 font-medium">{k}:</span>
                    <span className={`font-bold ${k === "Photo" && !photoPreview ? "text-amber-600" : "text-zinc-900"}`}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {successData && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <p className="font-bold text-emerald-800 text-sm">Onboarding pipeline initiated!</p>
                </div>
                <p className="text-xs text-emerald-700">
                  <strong>{successData.name}</strong> ({successData.id}) has been added to the onboarding hub.
                </p>
                <a href={`/onboarding/${successData.hireId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 underline">
                  View onboarding checklist →
                </a>
              </div>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
          <div>
            {step > 1 && !successData && (
              <Button type="button" variant="outline" className="text-xs font-bold" onClick={() => setStep((s) => Math.max(1, s - 1))}>
                Back
              </Button>
            )}
          </div>
          <div>
            {step < 5 ? (
              <Button type="button" className="rounded-lg bg-zinc-950 text-white text-xs font-bold hover:-translate-y-0.5 transition-all" onClick={handleNext}>
                Save & Next
              </Button>
            ) : !successData ? (
              <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 disabled:opacity-50">
                {isSubmitting ? "Creating pipeline…" : "🚀 Create Onboarding Pipeline"}
              </Button>
            ) : (
              <a href="/onboarding" className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 text-white text-xs font-bold px-4 py-2 hover:bg-zinc-800 transition-all">
                Back to Onboarding Hub →
              </a>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
