"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { breakdownFromCTC } from "@/lib/utils/payrollEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const wizardSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().or(z.literal("")).refine(
    (val) => !val || /^\+\d{1,4}\d{10}$/.test(val),
    { message: "Phone number must include country code (e.g. +91) followed by exactly 10 digits" }
  ),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional().or(z.literal("")).refine(
    (val) => !val || /^\d{6}$/.test(val),
    { message: "Pincode must be exactly 6 digits" }
  ),
  designation: z.string().min(1),
  departmentId: z.string().min(1),
  managerId: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "INTERN", "CONTRACT"]),
  joiningDate: z.string().min(1),
  ctc: z.number().min(0).optional(),
  templateId: z.string().optional(),
});

type FormValues = z.infer<typeof wizardSchema>;

type DepartmentOption = {
  id: string;
  name: string;
};

type ManagerOption = {
  id: string;
  firstName: string;
  lastName: string;
};

type TemplateOption = {
  id: string;
  name: string;
  description?: string | null;
};

interface NewHireWizardProps {
  departments: DepartmentOption[];
  managers: ManagerOption[];
  templates: TemplateOption[];
}

export function NewHireWizard({ departments, managers, templates }: NewHireWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      employmentType: "INTERN",
      templateId: templates[0]?.id ?? "",
      joiningDate: new Date().toISOString().slice(0, 10),
    },
  });

  const ctc = watch("ctc") || 0;
  const compensation = useMemo(() => {
    if (!ctc || ctc <= 0) return null;
    return breakdownFromCTC(ctc);
  }, [ctc]);

  const nextStep = () => setStep((value) => Math.min(5, value + 1));
  const prevStep = () => setStep((value) => Math.max(1, value - 1));

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ["firstName", "lastName", "email"];
    } else if (step === 2) {
      fieldsToValidate = ["designation", "departmentId", "joiningDate"];
    } else if (step === 3) {
      fieldsToValidate = ["ctc"];
    } else if (step === 4) {
      fieldsToValidate = ["templateId"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      nextStep();
    }
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/onboarding/hire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const payload = await response.json();
      if (!response.ok) {
        setErrorMessage(payload.error?.message || "Failed to create onboarding hire.");
        return;
      }

      setSuccessMessage(`Welcome invitation created for ${payload.employee.firstName} ${payload.employee.lastName}.`);
      setStep(5);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-md hover:shadow-lg transition-all duration-300">
      {/* Step Progress Roadmap Header */}
      <div className="mb-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-zinc-100 pb-5">
          <div>
            <h3 className="text-base font-bold text-zinc-950 tracking-tight">New Hire Onboarding</h3>
            <p className="text-xs text-zinc-400 font-medium">Add a new teammate to the pipeline and configure their workspace.</p>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 self-start md:self-auto bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-full">
            Step {step} of 5
          </span>
        </div>
        
        {/* Step dots with names */}
        <div className="relative mt-8 flex justify-between items-center w-full px-2">
          {/* Progress bar line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-100 -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-zinc-950 -translate-y-1/2 z-0 transition-all duration-500 ease-in-out" 
            style={{ width: `${((step - 1) / 4) * 100}%` }}
          />

          {[
            { num: 1, label: "Personal" },
            { num: 2, label: "Job Role" },
            { num: 3, label: "Salary" },
            { num: 4, label: "Workflow" },
            { num: 5, label: "Review" }
          ].map((s) => {
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div 
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? "bg-zinc-950 text-white shadow-sm" 
                      : isActive 
                        ? "bg-white border-2 border-zinc-950 text-zinc-950 scale-110 shadow-sm" 
                        : "bg-zinc-50 border border-zinc-200 text-zinc-400"
                  }`}
                >
                  {isCompleted ? "✓" : s.num}
                </div>
                <span className={`absolute top-8 text-[10px] font-bold whitespace-nowrap tracking-wider uppercase transition-colors duration-300 ${
                  isActive ? "text-zinc-900" : "text-zinc-400"
                }`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
        {step === 1 && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="firstName">First Name</Label>
              <Input id="firstName" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("firstName")} />
              {errors.firstName && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.firstName.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="lastName">Last Name</Label>
              <Input id="lastName" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("lastName")} />
              {errors.lastName && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.lastName.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="email">Company Email</Label>
              <Input id="email" type="email" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("email")} />
              {errors.email && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.email.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("phone")} />
              {errors.phone && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.phone.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("dateOfBirth")} />
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="gender">Gender</Label>
              <select id="gender" className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm" {...register("gender")}>
                <option value="">Select</option>
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="address">Address</Label>
              <Textarea id="address" rows={2} className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("address")} />
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="city">City</Label>
              <Input id="city" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("city")} />
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="state">State</Label>
              <Input id="state" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("state")} />
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="pincode">Pincode</Label>
              <Input id="pincode" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("pincode")} />
              {errors.pincode && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.pincode.message}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="designation">Designation</Label>
              <Input id="designation" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("designation")} />
              {errors.designation && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.designation.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="departmentId">Department</Label>
              <select id="departmentId" className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm" {...register("departmentId")}>
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="mt-1 text-[10px] font-semibold text-rose-600">{errors.departmentId.message}</p>}
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="managerId">Manager</Label>
              <select id="managerId" className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm" {...register("managerId")}>
                <option value="">No manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.firstName} {manager.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="employmentType">Employment Type</Label>
              <select id="employmentType" className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm" {...register("employmentType")}> 
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="INTERN">Intern</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="joiningDate">Joining Date</Label>
              <Input id="joiningDate" type="date" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("joiningDate")} />
            </div>
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="ctc">CTC (Annual)</Label>
              <Input id="ctc" type="number" step="1000" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 placeholder:text-zinc-400 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("ctc", { valueAsNumber: true })} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="max-w-md">
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="ctc">CTC (Annual Salary)</Label>
              <Input id="ctc" type="number" step="1000" className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none focus-visible:ring-zinc-950 shadow-sm" {...register("ctc", { valueAsNumber: true })} />
              <p className="mt-2 text-[10px] text-zinc-400 font-semibold">Compensation components are auto-calculated in real-time below.</p>
            </div>
            
            {/* Redesigned compensation widget grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-150 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Basic Salary</p>
                <p className="mt-2.5 text-2xl font-extrabold text-zinc-900">₹{(compensation?.basicSalary ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] font-semibold text-zinc-400 block mt-1">50% of annual CTC</span>
              </div>
              <div className="rounded-xl border border-zinc-150 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">HRA</p>
                <p className="mt-2.5 text-2xl font-extrabold text-zinc-900">₹{(compensation?.hra ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] font-semibold text-zinc-400 block mt-1">40% of Basic Salary</span>
              </div>
              <div className="rounded-xl border border-zinc-150 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Special Allowance</p>
                <p className="mt-2.5 text-2xl font-extrabold text-zinc-900">₹{(compensation?.specialAllowance ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] font-semibold text-zinc-400 block mt-1">Remaining balance</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 border-t border-zinc-100 pt-5">
              <div className="rounded-xl border border-zinc-150 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">PF Contribution</p>
                <p className="mt-2.5 text-2xl font-extrabold text-zinc-900">₹{(compensation?.pf ?? 0).toLocaleString("en-IN")}</p>
                <span className="text-[9px] font-semibold text-zinc-400 block mt-1">12% of Basic Salary</span>
              </div>
              <div className="rounded-xl border border-zinc-150 bg-gradient-to-br from-zinc-50 to-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Monthly Gross Salary</p>
                <p className="mt-2.5 text-2xl font-extrabold text-zinc-900">₹{compensation ? Math.round(ctc / 12).toLocaleString("en-IN") : 0}</p>
                <span className="text-[9px] font-semibold text-zinc-400 block mt-1">Before deductions</span>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wider" htmlFor="templateId">Onboarding Template</Label>
              <select id="templateId" className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 outline-none transition-all focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 shadow-sm" {...register("templateId")}>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
            
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Default Tasks & Milestones Included</p>
              <div className="grid gap-2 text-xs text-zinc-600 font-medium">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px]">1</span>
                  <span>Document collection (Aadhaar, PAN, certificates)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px]">2</span>
                  <span>IT Provisioning & accounts setup (Email, Slack, GitHub)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px]">3</span>
                  <span>Company orientation & bootcamp registration</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px]">4</span>
                  <span>Financial enrollment & bank setup for payroll</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 space-y-4">
              <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-wider">Preview Welcome Invitation</h4>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                We will send an invitation email to the employee onboarding pipeline. The system will auto-provision their HRMS workspace and populate task checklists.
              </p>
              
              <div className="border-t border-zinc-100 pt-4 grid gap-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Employee Name:</span>
                  <span className="text-zinc-900 font-bold">{watch("firstName")} {watch("lastName")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Company Email:</span>
                  <span className="text-zinc-900 font-bold">{watch("email")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Designation:</span>
                  <span className="text-zinc-900 font-bold">{watch("designation")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-medium">Joining Date:</span>
                  <span className="text-zinc-900 font-bold">{watch("joiningDate")}</span>
                </div>
              </div>
            </div>
            
            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
                {errorMessage}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
          <div>
            {step > 1 && (
              <Button type="button" variant="outline" className="rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 hover:-translate-y-0.5 transition-all duration-300" onClick={prevStep}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 5 ? (
              <Button type="button" className="rounded-lg bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 hover:-translate-y-0.5 transition-all duration-300" onClick={handleNext}>
                Save & next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting} className="rounded-lg bg-zinc-950 text-white text-xs font-bold hover:bg-zinc-800 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50">
                {isSubmitting ? "Creating..." : "Create Onboarding Invite"}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
