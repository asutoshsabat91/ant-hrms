"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  FileSpreadsheet,
  Printer,
  X,
  Upload,
  Camera,
} from "lucide-react";
import type { Employee, Department } from "@prisma/client";

type EmployeeWithDept = Employee & { department: Department };

interface PortalClientProps {
  employee: EmployeeWithDept;
  isAdmin?: boolean;
}

export function PortalClient({ employee, isAdmin = false }: PortalClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "overview" | "personal" | "tax-declaration" | "hra" | "payslips" | "epf"
  >(isAdmin ? "overview" : "personal");

  useEffect(() => {
    if (
      tabParam === "payslips" ||
      tabParam === "personal" ||
      tabParam === "tax-declaration" ||
      tabParam === "hra" ||
      tabParam === "epf" ||
      (isAdmin && tabParam === "overview")
    ) {
      setActiveTab(tabParam as "overview" | "personal" | "tax-declaration" | "hra" | "payslips" | "epf");
    } else if (!isAdmin && (!tabParam || tabParam === "overview")) {
      setActiveTab("personal");
    }
  }, [tabParam, isAdmin]);

  const handleTabChange = (tab: typeof activeTab) => {
    if (!isAdmin && tab === "overview") return;
    setActiveTab(tab);
    router.push(`/portal?tab=${tab}`);
  };

  // Personal Info form states
  const [firstName, setFirstName] = useState(employee.firstName || "");
  const [lastName, setLastName] = useState(employee.lastName || "");
  const [personalEmail, setPersonalEmail] = useState(employee.personalEmail || "");
  const [phone, setPhone] = useState(employee.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : "");
  const [gender, setGender] = useState(employee.gender || "");
  const [bloodGroup, setBloodGroup] = useState(employee.bloodGroup || "");
  const [currentAddress, setCurrentAddress] = useState(employee.address || "");
  const [permanentAddress, setPermanentAddress] = useState((employee as unknown as { permanentAddress?: string | null }).permanentAddress || "");
  const [city, setCity] = useState(employee.city || "");
  const [state, setState] = useState(employee.state || "Odisha");
  const [pincode, setPincode] = useState(employee.pincode || "");
  const [emergencyContact, setEmergencyContact] = useState(employee.emergencyContact || "");
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergencyPhone || "");
  const [profilePhoto, setProfilePhoto] = useState(employee.profilePhoto || "");
  const [photoPreview, setPhotoPreview] = useState<string | null>(employee.profilePhoto || null);
  const [sameAddress, setSameAddress] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [personalMsg, setPersonalMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handlePersonalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload a JPG/PNG image."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setProfilePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  async function savePersonalInfo() {
    setPersonalSaving(true);
    setPersonalMsg(null);
    try {
      const res = await fetch("/api/onboarding/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          firstName,
          lastName,
          personalEmail,
          phone,
          dateOfBirth,
          gender,
          bloodGroup,
          currentAddress,
          permanentAddress: sameAddress ? currentAddress : permanentAddress,
          city,
          state,
          pincode,
          emergencyContact,
          emergencyPhone,
          profilePhoto,
        }),
      });
      const data = await res.json();
      setPersonalMsg({ ok: res.ok, text: res.ok ? "Personal details saved and submitted to HR!" : (data.error || "Failed to save details.") });
      if (res.ok) {
        setAlertMsg({ type: "success", text: "Personal details submitted successfully!" });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setPersonalMsg({ ok: false, text: "Something went wrong." });
    } finally {
      setPersonalSaving(false);
    }
  }

  // Load from LocalStorage or fallbacks
  const storageKey = `antbox_ess_${employee.id}`;
  const [regime, setRegime] = useState<"NEW" | "OLD">("NEW");
  
  // 80C Declarations
  const [elss, setElss] = useState(0);
  const [ppf, setPpf] = useState(0);
  const [lic, setLic] = useState(0);
  const [tuition, setTuition] = useState(0);
  const [nsc, setNsc] = useState(0);
  const [homeLoanPrincipal, setHomeLoanPrincipal] = useState(0);

  // 80D Declarations
  const [mediclaimSelf, setMediclaimSelf] = useState(0);
  const [mediclaimParents, setMediclaimParents] = useState(0);

  // Section 24(b)
  const [homeLoanInterest, setHomeLoanInterest] = useState(0);

  // HRA
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [landlordName, setLandlordName] = useState("");
  const [landlordPAN, setLandlordPAN] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");

  // EPF / Gratuity
  const [uan, setUan] = useState(employee.uan || "");
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeRelation, setNomineeRelation] = useState("");
  const [nomineeAge, setNomineeAge] = useState("");
  const [nomineeShare, setNomineeShare] = useState(100);

  // Notifications/Alerts
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Payslip Modal State
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Load state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.regime) setRegime(parsed.regime);
        if (parsed.elss) setElss(parsed.elss);
        if (parsed.ppf) setPpf(parsed.ppf);
        if (parsed.lic) setLic(parsed.lic);
        if (parsed.tuition) setTuition(parsed.tuition);
        if (parsed.nsc) setNsc(parsed.nsc);
        if (parsed.homeLoanPrincipal) setHomeLoanPrincipal(parsed.homeLoanPrincipal);
        if (parsed.mediclaimSelf) setMediclaimSelf(parsed.mediclaimSelf);
        if (parsed.mediclaimParents) setMediclaimParents(parsed.mediclaimParents);
        if (parsed.homeLoanInterest) setHomeLoanInterest(parsed.homeLoanInterest);
        if (parsed.monthlyRent) setMonthlyRent(parsed.monthlyRent);
        if (parsed.landlordName) setLandlordName(parsed.landlordName);
        if (parsed.landlordPAN) setLandlordPAN(parsed.landlordPAN);
        if (parsed.landlordAddress) setLandlordAddress(parsed.landlordAddress);
        if (parsed.uan) setUan(parsed.uan);
        if (parsed.nomineeName) setNomineeName(parsed.nomineeName);
        if (parsed.nomineeRelation) setNomineeRelation(parsed.nomineeRelation);
        if (parsed.nomineeAge) setNomineeAge(parsed.nomineeAge);
        if (parsed.nomineeShare) setNomineeShare(parsed.nomineeShare);
      }
    } catch {
      // Ignored
    }
  }, [storageKey]);

  // Save changes helper
  const saveState = (updatedFields: Record<string, unknown>) => {
    try {
      const saved = localStorage.getItem(storageKey);
      const current = saved ? JSON.parse(saved) : {};
      const next = { ...current, ...updatedFields };
      localStorage.setItem(storageKey, JSON.stringify(next));
      
      setAlertMsg({ type: "success", text: "Declarations saved and recalculated successfully!" });
      setTimeout(() => setAlertMsg(null), 3000);
    } catch {
      setAlertMsg({ type: "error", text: "Failed to save declarations." });
    }
  };

  // Indian Salary Computations (Monthly)
  const basic = employee.basicSalary || 0;
  const hraVal = employee.hra || 0;
  const allowance = employee.specialAllowance || 0;
  const grossMonthly = basic + hraVal + allowance;
  const grossAnnual = grossMonthly * 12;

  // PF calculation: 12% of basic, capped at 1800 or uncapped.
  // Standard Indian HRMS PF capped at 1800 unless employee opts for full basic PF.
  const pfMonthly = Math.round(basic * 0.12);
  const pfAnnual = pfMonthly * 12;
  const ptMonthly = employee.professionalTax || 200; // Odisha PT is standard 200

  // Tax Declarations Summaries
  const dec80C = pfAnnual + elss + ppf + lic + tuition + nsc + homeLoanPrincipal;
  const deduction80C = regime === "OLD" ? Math.min(dec80C, 150000) : 0;

  const dec80D = mediclaimSelf + mediclaimParents;
  const deduction80D = regime === "OLD" ? (Math.min(mediclaimSelf, 25000) + Math.min(mediclaimParents, 50000)) : 0;

  const deductionSec24 = regime === "OLD" ? Math.min(homeLoanInterest, 200000) : 0;

  // HRA Exemption Calculator (under Old Regime)
  const annualRent = monthlyRent * 12;
  const excessRent = Math.max(0, annualRent - (basic * 12 * 0.1));
  const basic40Pct = basic * 12 * 0.4;
  const hraExemption = regime === "OLD" ? Math.min(hraVal * 12, excessRent, basic40Pct) : 0;

  // Standard Deduction in India is ₹50,000 for both old/new regime
  const standardDeduction = 50000;
  
  const totalDeductions = regime === "OLD" 
    ? (deduction80C + deduction80D + deductionSec24 + hraExemption + standardDeduction)
    : standardDeduction;

  const taxableIncome = Math.max(0, grossAnnual - totalDeductions);

  // Income Tax (TDS) Indian Slab Rate Calculator (FY 2025-26 slabs)
  const calculateAnnualTax = (income: number, regimeType: "NEW" | "OLD") => {
    let tax = 0;
    if (regimeType === "NEW") {
      // New Regime Slabs:
      // Upto 3,00,000 : Nil
      // 3,00,001 - 6,00,000 : 5%
      // 6,00,001 - 9,00,000 : 10%
      // 9,00,001 - 12,00,000 : 15%
      // 12,00,001 - 15,00,000 : 20%
      // Above 15,00,000 : 30%
      if (income <= 700000) {
        // Section 87A Tax Rebate covers full tax upto 7L taxable income under New Regime
        return 0;
      }
      if (income > 300000) {
        tax += Math.min(300000, income - 300000) * 0.05;
      }
      if (income > 600000) {
        tax += Math.min(300000, income - 600000) * 0.10;
      }
      if (income > 900000) {
        tax += Math.min(300000, income - 900000) * 0.15;
      }
      if (income > 1200000) {
        tax += Math.min(300000, income - 1200000) * 0.20;
      }
      if (income > 1500000) {
        tax += (income - 1500000) * 0.30;
      }
    } else {
      // Old Regime Slabs:
      // Upto 2,50,000 : Nil
      // 2,50,001 - 5,00,000 : 5%
      // 5,00,001 - 10,00,000 : 20%
      // Above 10,00,000 : 30%
      if (income <= 500000) {
        // Section 87A rebate covers tax upto 5L taxable income under Old Regime
        return 0;
      }
      if (income > 25000) {
        tax += Math.min(250000, income - 250000) * 0.05;
      }
      if (income > 500000) {
        tax += Math.min(500000, income - 500000) * 0.20;
      }
      if (income > 1000000) {
        tax += (income - 1000000) * 0.30;
      }
    }
    // Add Health & Education Cess @ 4%
    return Math.round(tax * 1.04);
  };

  const annualTax = calculateAnnualTax(taxableIncome, regime);
  const tdsMonthly = Math.round(annualTax / 12);
  const netMonthlyPay = grossMonthly - (pfMonthly + ptMonthly + tdsMonthly);

  // Indian Landlord PAN Regex check (Standard: 5 alphabets, 4 digits, 1 alphabet)
  const isPanValid = (panStr: string) => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panStr.toUpperCase());
  };

  // Convert Number to Words (Indian Currency format)
  const numToWords = (num: number): string => {
    const a = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
      "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    const formatWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "");
      if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + formatWords(n % 100) : "");
      if (n < 100000) return formatWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + formatWords(n % 1000) : "");
      if (n < 10000000) return formatWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + formatWords(n % 100000) : "");
      return formatWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + formatWords(n % 10000000) : "");
    };

    if (num === 0) return "Zero";
    return formatWords(num) + " Rupees Only";
  };

  // Indian Months representation (FY 2026-27)
  const financialMonths = [
    { key: "04-2026", name: "April 2026" },
    { key: "05-2026", name: "May 2026" },
    { key: "06-2026", name: "June 2026" },
    { key: "07-2026", name: "July 2026" },
    { key: "08-2026", name: "August 2026" },
    { key: "09-2026", name: "September 2026" },
    { key: "10-2026", name: "October 2026" },
    { key: "11-2026", name: "November 2026" },
    { key: "12-2026", name: "December 2026" },
    { key: "01-2027", name: "January 2027" },
    { key: "02-2027", name: "February 2027" },
    { key: "03-2027", name: "March 2027" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            {isAdmin ? "EMPLOYEE SELF-SERVICE (ESS)" : "PERSONAL PROFILE"}
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            {isAdmin ? (
              <>Self-Service <span className="italic-serif text-4xl font-light">Portal</span></>
            ) : (
              <>Personal <span className="italic-serif text-4xl font-light">Info</span></>
            )}
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            {isAdmin 
              ? "Declare investments, track annual TDS deductions, view/download monthly salary slips, and check EPF logs."
              : "Please complete and update your personal details for official company records."
            }
          </p>
        </div>

        {/* Global Floating alert banner */}
        {alertMsg && (
          <div
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold shadow-sm transition-all duration-300 ${
              alertMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {alertMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{alertMsg.text}</span>
          </div>
        )}
      </div>

      {/* Tabs list */}
      {isAdmin && (
        <div className="flex border-b border-zinc-200 gap-6 text-xs font-bold uppercase tracking-wider text-zinc-400">
          <button
            onClick={() => handleTabChange("overview")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "overview"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => handleTabChange("personal")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "personal"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            Personal
          </button>
          <button
            onClick={() => handleTabChange("tax-declaration")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "tax-declaration"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            IT Declarations
          </button>
          <button
            onClick={() => handleTabChange("hra")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "hra"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            HRA Rent
          </button>
          <button
            onClick={() => handleTabChange("payslips")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "payslips"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            Payslips & Form 16
          </button>
          <button
            onClick={() => handleTabChange("epf")}
            className={`pb-3 border-b-2 transition-all duration-200 ${
              activeTab === "epf"
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent hover:text-zinc-600"
            }`}
          >
            EPF & Nomination
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div className="space-y-6">

        {/* TAB 0.5: PERSONAL INFO */}
        {activeTab === "personal" && (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm space-y-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-900">Personal Information</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Please complete your personal profile details for company records.
              </p>
            </div>

            {/* Passport Photo Upload */}
            <div className="flex items-start gap-5 border-b border-zinc-100 pb-6">
              <label
                htmlFor="personal-photo-input"
                className="relative flex h-24 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 hover:border-violet-400/60 hover:bg-violet-50 transition-all overflow-hidden"
              >
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Passport photo" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Camera className="h-5 w-5 text-zinc-400" />
                    <span className="text-[9px] font-semibold text-zinc-400 text-center leading-tight">Passport<br/>Photo</span>
                  </div>
                )}
                <input
                  id="personal-photo-input"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={handlePersonalPhotoUpload}
                />
              </label>
              <div className="flex-1">
                <p className="text-xs font-bold text-zinc-700">Passport Size Photo <span className="text-rose-500">*</span></p>
                <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                  Required for identity card creation and compliance. Upload a clear face photo in JPG/PNG format (max 2MB).
                </p>
                <label
                  htmlFor="personal-photo-input"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-zinc-600 hover:border-violet-400/60 hover:text-violet-600 transition-colors cursor-pointer"
                >
                  <Upload className="h-3 w-3" />{photoPreview ? "Change Photo" : "Upload Photo"}
                </label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">First Name *</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                  placeholder="Riya"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Last Name *</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                  placeholder="Sharma"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Company Email</label>
                <input
                  type="email"
                  disabled
                  value={employee.email}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none text-zinc-500 cursor-not-allowed font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Personal Email *</label>
                <input
                  type="email"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                  placeholder="you@gmail.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Phone (+91)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                >
                  <option value="">Select</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="OTHER">Non-binary / Other</option>
                  <option value="PREFER_NOT">Prefer not to say</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                >
                  <option value="">Select</option>
                  {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Addresses */}
            <div className="space-y-4 border-t border-zinc-100 pt-6">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Current Address</label>
                <textarea
                  value={currentAddress}
                  onChange={(e) => setCurrentAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900 resize-none"
                  placeholder="Flat/House No., Street, Area…"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="personalSameAddr"
                  checked={sameAddress}
                  onChange={(e) => {
                    setSameAddress(e.target.checked);
                    if (e.target.checked) setPermanentAddress(currentAddress);
                  }}
                  className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                />
                <label htmlFor="personalSameAddr" className="text-xs text-zinc-500 font-medium">Permanent address same as current</label>
              </div>
              {!sameAddress && (
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Permanent Address</label>
                  <textarea
                    value={permanentAddress}
                    onChange={(e) => setPermanentAddress(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900 resize-none"
                    placeholder="Permanent address…"
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    placeholder="Bhubaneswar"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    placeholder="Odisha"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Pincode</label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    placeholder="751001"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4 space-y-4">
              <p className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Emergency Contact</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    placeholder="Parent / Guardian name"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    placeholder="9876543210"
                  />
                </div>
              </div>
            </div>

            {personalMsg && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-xs ${personalMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                {personalMsg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                {personalMsg.text}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-zinc-100">
              <button
                onClick={savePersonalInfo}
                disabled={personalSaving}
                className="rounded-lg bg-zinc-950 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {personalSaving ? "Saving details…" : "Submit Personal Details"}
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left double column */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Regime Selector Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Income Tax Regime Option</h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Choose between the New Slab Rates (Section 115BAC) or the Old Slab Rates with deductions.
                    </p>
                  </div>
                  <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-1">
                    <button
                      onClick={() => {
                        setRegime("NEW");
                        saveState({ regime: "NEW" });
                      }}
                      className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        regime === "NEW"
                          ? "bg-zinc-950 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      New Regime
                    </button>
                    <button
                      onClick={() => {
                        setRegime("OLD");
                        saveState({ regime: "OLD" });
                      }}
                      className={`rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        regime === "OLD"
                          ? "bg-zinc-950 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-800"
                      }`}
                    >
                      Old Regime
                    </button>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-100 pt-4 grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="rounded-lg bg-zinc-50/50 border border-zinc-150 p-3">
                    <p className="font-bold text-zinc-800">New Tax Regime Slab Rates</p>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Lower tax slab rates. Standard deduction of ₹50,000 applies. No exemptions for HRA, 80C, or 80D.
                      Rebate under Section 87A makes tax zero up to ₹7,00,000 net income.
                    </p>
                  </div>
                  <div className="rounded-lg bg-zinc-50/50 border border-zinc-150 p-3">
                    <p className="font-bold text-zinc-800">Old Tax Regime Slab Rates</p>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      Slab rates (5%, 20%, 30%). Allows major exemptions: 80C (up to ₹1.5L), 80D insurance, Home Loan interest, and full HRA rent rebate.
                    </p>
                  </div>
                </div>

                {/* Side-by-Side Tax Slab Comparison */}
                <div className="mt-6 border-t border-zinc-100 pt-6 space-y-3">
                  <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">Side-by-Side Income Tax Slab Comparison (FY 2026-27)</h4>
                  <div className="overflow-hidden rounded-lg border border-zinc-150 bg-white">
                    <table className="w-full border-collapse text-left text-[11px]">
                      <thead className="bg-zinc-50 text-[9px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-150">
                        <tr>
                          <th className="px-4 py-2">Income Bracket</th>
                          <th className="px-4 py-2">Old Regime Rates</th>
                          <th className="px-4 py-2">New Regime Rates</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-600">
                        <tr>
                          <td className="px-4 py-2 font-medium">Up to ₹3,00,000</td>
                          <td className="px-4 py-2">Nil (Up to ₹2.5L is Nil, 2.5L-3L is 5%)</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">Nil</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹3,00,001 - ₹5,00,000</td>
                          <td className="px-4 py-2">5%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">5%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹5,00,001 - ₹6,00,000</td>
                          <td className="px-4 py-2">20%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">5%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹6,00,001 - ₹9,00,000</td>
                          <td className="px-4 py-2">20%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">10%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹9,00,001 - ₹10,00,000</td>
                          <td className="px-4 py-2">20%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">15%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹10,00,001 - ₹12,00,000</td>
                          <td className="px-4 py-2">30%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">15%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">₹12,00,001 - ₹15,00,000</td>
                          <td className="px-4 py-2">30%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">20%</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-medium">Above ₹15,00,000</td>
                          <td className="px-4 py-2">30%</td>
                          <td className="px-4 py-2 text-zinc-900 font-semibold">30%</td>
                        </tr>
                        <tr className="bg-zinc-50/50 font-semibold text-zinc-800">
                          <td className="px-4 py-2">Tax Rebate Eligibility</td>
                          <td className="px-4 py-2">Rebate up to ₹5 Lakhs (Sec 87A)</td>
                          <td className="px-4 py-2 text-zinc-900 font-bold">Rebate up to ₹7 Lakhs (Sec 87A)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Section 80C Progress Tracker Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Section 80C Tax-Saving Progress Tracker</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Track your declared investments toward the ₹1,50,000 annual limit.</p>
                  </div>
                  <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-md">
                    {Math.min(100, (dec80C / 150000) * 100).toFixed(0)}% Achieved
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-zinc-100 h-3.5 rounded-full overflow-hidden p-0.5 border">
                    <div
                      className="bg-zinc-900 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (dec80C / 150000) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase">
                    <span>Declared: ₹{dec80C.toLocaleString("en-IN")}</span>
                    <span>Max Saving Limit: ₹1,50,000</span>
                  </div>
                </div>
              </div>

              {/* annual summary table */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-zinc-900">Income Tax Calculation Worksheet</h3>
                <div className="overflow-hidden rounded-lg border border-zinc-150">
                  <table className="w-full border-collapse text-left text-xs text-zinc-600">
                    <thead className="bg-zinc-50 border-b border-zinc-150 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      <tr>
                        <th className="px-4 py-2.5">Calculation Item</th>
                        <th className="px-4 py-2.5 text-right">Declared Value</th>
                        <th className="px-4 py-2.5 text-right">Tax Exempt Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr>
                        <td className="px-4 py-3 font-semibold text-zinc-800">Gross Annual Salary (CTC components)</td>
                        <td className="px-4 py-3 text-right">₹{grossAnnual.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right">—</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Section 80C Deductions (PPF, ELSS, EPF, etc.)</td>
                        <td className="px-4 py-3 text-right">₹{dec80C.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-zinc-900 font-semibold">₹{deduction80C.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Section 80D Deductions (Health Mediclaim)</td>
                        <td className="px-4 py-3 text-right">₹{dec80D.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-zinc-900 font-semibold">₹{deduction80D.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Section 24(b) Deductions (Home Loan Interest)</td>
                        <td className="px-4 py-3 text-right">₹{homeLoanInterest.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-zinc-900 font-semibold">₹{deductionSec24.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">HRA Tax Exemption (House Rent Allowance)</td>
                        <td className="px-4 py-3 text-right">₹{annualRent.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-3 text-right text-zinc-900 font-semibold">₹{hraExemption.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-3">Standard Deduction (Salaried Employees)</td>
                        <td className="px-4 py-3 text-right">₹50,000</td>
                        <td className="px-4 py-3 text-right text-zinc-900 font-semibold">₹50,000</td>
                      </tr>
                      <tr className="bg-zinc-50/50 font-bold border-t border-zinc-150">
                        <td className="px-4 py-3 text-zinc-800">Total Deductions Applied</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right text-zinc-900">₹{totalDeductions.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr className="bg-zinc-950 text-white font-bold">
                        <td className="px-4 py-3">Taxable Net Income</td>
                        <td className="px-4 py-3 text-right">—</td>
                        <td className="px-4 py-3 text-right">₹{taxableIncome.toLocaleString("en-IN")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right single column */}
            <div className="space-y-6">
              
              {/* Monthly Net Pay Card */}
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 text-white flex flex-col justify-between h-[220px] shadow-sm">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    ESTIMATED TAKE HOME (MONTHLY)
                  </p>
                  <p className="text-3xl font-bold mt-2 font-mono tracking-tight text-white">
                    ₹{netMonthlyPay.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[9px] text-zinc-400 font-semibold mt-1">
                    Calculated post EPF, PT, and dynamic Income Tax (TDS) slab cuts.
                  </p>
                </div>
                
                <div className="border-t border-zinc-800 pt-3 space-y-1 text-[10px] text-zinc-400 font-semibold">
                  <div className="flex justify-between">
                    <span>Gross Salary:</span>
                    <span className="text-white">₹{grossMonthly.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>PF Cut:</span>
                    <span className="text-white">₹{pfMonthly.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TDS (Income Tax):</span>
                    <span className="text-white">₹{tdsMonthly.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Annual Tax Card */}
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm flex flex-col justify-between h-[220px]">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                    ANNUAL TAX (TDS) ESTIMATE
                  </p>
                  <p className="text-4xl font-extrabold text-zinc-950 mt-4 leading-none font-mono">
                    ₹{annualTax.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="w-full bg-zinc-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-zinc-900 h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (annualTax / (grossAnnual || 1)) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Effective tax rate: {((annualTax / (grossAnnual || 1)) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: IT DECLARATIONS */}
        {activeTab === "tax-declaration" && (
          <div className="space-y-6">
            {regime === "NEW" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 flex gap-4 text-xs text-amber-800 leading-relaxed shadow-sm">
                <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Deductions disabled under New Tax Regime</p>
                  <p className="mt-1">
                    You have opted for the <strong>New Tax Regime</strong>. Under Section 115BAC, exemptions like 80C, 80D, and Section 24 are not eligible.
                    To file investment declarations and deduct taxable income, please switch to the <strong>Old Tax Regime</strong> in the Overview tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* 80C Declarations Form */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Section 80C Deductions</h3>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                      Max allowed exemption: ₹1,50,000 per financial year.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        EPF Contribution (Employer Computed)
                      </label>
                      <input
                        type="text"
                        disabled
                        value={`₹${pfAnnual.toLocaleString("en-IN")} (₹${pfMonthly}/month)`}
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs outline-none text-zinc-500 font-semibold cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Public Provident Fund (PPF)
                      </label>
                      <input
                        type="number"
                        value={ppf}
                        onChange={(e) => setPpf(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        ELSS Tax Mutual Funds
                      </label>
                      <input
                        type="number"
                        value={elss}
                        onChange={(e) => setElss(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Life Insurance Premium (LIC)
                      </label>
                      <input
                        type="number"
                        value={lic}
                        onChange={(e) => setLic(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Children Tuition Fees (School fees)
                      </label>
                      <input
                        type="number"
                        value={tuition}
                        onChange={(e) => setTuition(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Principal Repayment on Housing Loan
                      </label>
                      <input
                        type="number"
                        value={homeLoanPrincipal}
                        onChange={(e) => setHomeLoanPrincipal(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="border-t border-zinc-100 pt-4 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-zinc-400 uppercase text-[9px]">Total Declared:</span>
                      <p className="text-zinc-900 font-bold text-sm">₹{dec80C.toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-400 uppercase text-[9px]">Allowed Exemption:</span>
                      <p className="text-zinc-950 font-extrabold text-sm">₹{deduction80C.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </div>

                {/* 80D & Section 24 Forms */}
                <div className="space-y-6">
                  {/* Section 80D */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Section 80D (Health Insurance)</h3>
                      <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                        Mediclaim premiums paid for Self/Family & Parents.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Self, Spouse, and Dependent Children (Max ₹25,000)
                        </label>
                        <input
                          type="number"
                          value={mediclaimSelf}
                          onChange={(e) => setMediclaimSelf(Number(e.target.value))}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                          Parents Mediclaim Premium (Max ₹50,000 if senior citizen)
                        </label>
                        <input
                          type="number"
                          value={mediclaimParents}
                          onChange={(e) => setMediclaimParents(Number(e.target.value))}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-zinc-400 uppercase text-[9px]">Total Declared:</span>
                        <p className="text-zinc-900 font-bold text-sm">₹{dec80D.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-400 uppercase text-[9px]">Allowed Exemption:</span>
                        <p className="text-zinc-950 font-extrabold text-sm">₹{deduction80D.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Section 24 */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-zinc-900">Section 24(b) (Home Loan Interest)</h3>
                      <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                        Exemption up to ₹2,00,000 for self-occupied home property.
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Interest payable on Housing Loan (Annual)
                      </label>
                      <input
                        type="number"
                        value={homeLoanInterest}
                        onChange={(e) => setHomeLoanInterest(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>

                    <div className="border-t border-zinc-100 pt-4 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-semibold text-zinc-400 uppercase text-[9px]">Declared Interest:</span>
                        <p className="text-zinc-900 font-bold text-sm">₹{homeLoanInterest.toLocaleString("en-IN")}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-zinc-400 uppercase text-[9px]">Allowed Exemption:</span>
                        <p className="text-zinc-950 font-extrabold text-sm">₹{deductionSec24.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  </div>

                  {/* Save Declaration Action */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() =>
                        saveState({
                          ppf,
                          elss,
                          lic,
                          tuition,
                          homeLoanPrincipal,
                          mediclaimSelf,
                          mediclaimParents,
                          homeLoanInterest,
                        })
                      }
                      className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      Save Declarations
                    </button>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HRA DECLARATION */}
        {activeTab === "hra" && (
          <div className="space-y-6">
            {regime === "NEW" ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 flex gap-4 text-xs text-amber-800 leading-relaxed shadow-sm">
                <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">HRA Exemption disabled under New Tax Regime</p>
                  <p className="mt-1">
                    You have opted for the <strong>New Tax Regime</strong>. Under Section 115BAC, House Rent Allowance (HRA) exemptions cannot be claimed.
                    To file rent details and receive tax exemptions, please switch to the <strong>Old Tax Regime</strong> in the Overview tab.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Form fields */}
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">House Rent Allowance (HRA) Details</h3>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                      Declare monthly rent paid to calculate tax exemptions.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Monthly Rent Paid (INR)
                      </label>
                      <input
                        type="number"
                        value={monthlyRent}
                        onChange={(e) => setMonthlyRent(Number(e.target.value))}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Landlord Full Name
                      </label>
                      <input
                        type="text"
                        value={landlordName}
                        onChange={(e) => setLandlordName(e.target.value)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 flex justify-between">
                        <span>Landlord Income Tax PAN</span>
                        {landlordPAN && (
                          <span
                            className={`text-[9px] font-bold uppercase tracking-normal ${
                              isPanValid(landlordPAN) ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {isPanValid(landlordPAN) ? "• Valid PAN Format" : "• Invalid Format"}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ABCDE1234F"
                        value={landlordPAN}
                        onChange={(e) => setLandlordPAN(e.target.value.toUpperCase())}
                        className={`w-full rounded-lg border px-3 py-2 text-xs outline-none text-zinc-900 ${
                          landlordPAN && !isPanValid(landlordPAN) ? "border-rose-300" : "border-zinc-200"
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                        Landlord Complete Address
                      </label>
                      <textarea
                        value={landlordAddress}
                        onChange={(e) => setLandlordAddress(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() =>
                        saveState({
                          monthlyRent,
                          landlordName,
                          landlordPAN,
                          landlordAddress,
                        })
                      }
                      className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      Save HRA Claims
                    </button>
                  </div>
                </div>

                {/* HRA calculation details */}
                <div className="space-y-6">
                  {/* Rent warning */}
                  {annualRent > 100000 && !landlordPAN && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 flex gap-3.5 text-xs text-rose-800 leading-relaxed shadow-sm">
                      <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Landlord PAN is mandatory</p>
                        <p className="mt-1">
                          Under Income Tax Department guidelines, if your annual rent exceeds <strong>₹1,00,000</strong> (your current annual rent: ₹{annualRent.toLocaleString("en-IN")}),
                          you must declare the landlord&apos;s PAN to qualify for HRA exemption.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Exemption breakdown */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-zinc-900">HRA Exemption Formula Breakdown</h3>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                      As per Rule 2A of Income Tax rules, HRA exemption is computed as the minimum of the following three parameters:
                    </p>

                    <div className="space-y-3 text-xs border-t border-zinc-100 pt-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">1. Actual HRA Received:</span>
                        <span className="font-bold text-zinc-800">₹{(hraVal * 12).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">2. Rent Paid minus 10% of Basic:</span>
                        <span className="font-bold text-zinc-800">₹{excessRent.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">3. 40% of Basic Salary (Non-metro):</span>
                        <span className="font-bold text-zinc-800">₹{basic40Pct.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between border-t border-zinc-100 pt-3 text-sm">
                        <span className="font-bold text-zinc-900">Net HRA Exemption:</span>
                        <span className="font-extrabold text-zinc-950">₹{hraExemption.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* TAB 4: PAYSLIPS & FORM 16 */}
        {activeTab === "payslips" && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Slips table */}
              <div className="flex-1 rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
                <div className="p-5 border-b border-zinc-100">
                  <h3 className="text-sm font-bold text-zinc-900">Monthly Salary Slips</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Select a month to inspect the details and print the payslip.</p>
                </div>
                
                <table className="w-full border-collapse text-left text-xs text-zinc-500">
                  <thead className="bg-zinc-50 border-b border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="px-6 py-3">Financial Month</th>
                      <th className="px-6 py-3 text-right">Gross Pay</th>
                      <th className="px-6 py-3 text-right">Total Deductions</th>
                      <th className="px-6 py-3 text-right">Net Pay</th>
                      <th className="px-6 py-3 text-right w-48">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {financialMonths.map((m) => (
                      <tr key={m.key} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-zinc-900">{m.name}</td>
                        <td className="px-6 py-3.5 text-right font-medium text-zinc-800">₹{grossMonthly.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-3.5 text-right font-medium text-zinc-800">₹{(pfMonthly + ptMonthly + tdsMonthly).toLocaleString("en-IN")}</td>
                        <td className="px-6 py-3.5 text-right font-bold text-zinc-950">₹{netMonthlyPay.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setSelectedMonth(m.name)}
                              className="text-[10px] font-bold text-zinc-800 border border-zinc-200 rounded px-2 py-1 hover:bg-zinc-50 transition-colors"
                            >
                              View Slip
                            </button>
                            <button
                              onClick={() => {
                                setSelectedMonth(m.name);
                                setTimeout(() => window.print(), 150);
                              }}
                              className="text-[10px] font-bold text-white bg-zinc-950 border border-zinc-900 rounded px-2.5 py-1 hover:bg-zinc-800 transition-colors flex items-center gap-1"
                            >
                              <Printer className="h-3 w-3" />
                              Download
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form 16 widget */}
              <div className="w-full md:w-80 space-y-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900">Income Tax Form 16</h3>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Annual TDS certificate issued by employer.</p>
                  </div>
                  <div className="rounded-lg bg-zinc-50 border border-zinc-150 p-4 text-center space-y-3">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-zinc-300" />
                    <div>
                      <p className="text-xs font-bold text-zinc-800">Assessment Year 2026-27</p>
                      <p className="text-[9px] text-zinc-400 font-semibold mt-1">
                        Form 16 Part A & B is generated after financial year closure and tax filings (approx. mid June 2027).
                      </p>
                    </div>
                    <button
                      disabled
                      className="w-full rounded-md border border-zinc-200 bg-zinc-100 py-1.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400 cursor-not-allowed"
                    >
                      Not Available Yet
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: EPF & GRATUITY NOMINATION */}
        {activeTab === "epf" && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* EPF card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Provident Fund (EPF) Log</h3>
                <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                  Universal Account Number (UAN) and employee provident fund account.
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                    UAN (Universal Account Number) - 12 digits
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={12}
                      value={uan}
                      onChange={(e) => setUan(e.target.value.replace(/[^0-9]/g, ""))}
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900 font-mono tracking-wider"
                    />
                    <button
                      onClick={() => {
                        if (uan.length !== 12) {
                          setAlertMsg({ type: "error", text: "UAN must consist of exactly 12 digits." });
                          setTimeout(() => setAlertMsg(null), 3000);
                          return;
                        }
                        saveState({ uan });
                      }}
                      className="rounded-lg bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                    >
                      Verify / Save
                    </button>
                  </div>
                </div>

                <div className="rounded-lg bg-zinc-50 border border-zinc-150 p-4 text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Universal Account No:</span>
                    <span className="font-bold text-zinc-900 font-mono">{uan || "Not Provided"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Monthly Contribution (Employee):</span>
                    <span className="font-bold text-zinc-900">₹{pfMonthly.toLocaleString("en-IN")} (12%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Monthly Contribution (Employer):</span>
                    <span className="font-bold text-zinc-900">₹{pfMonthly.toLocaleString("en-IN")} (12%)</span>
                  </div>
                  <p className="text-[9px] text-zinc-400 font-semibold leading-relaxed mt-2">
                    EPF is deposited directly to the Employee Provident Fund Organization of India (EPFO) portal under the company code OR/BBSR/4421.
                  </p>
                </div>
              </div>
            </div>

            {/* Gratuity Nomination card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Gratuity Nomination (Form F)</h3>
                <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">
                  Declare nominees for Gratuity payout under Payment of Gratuity Act, 1972.
                </p>
              </div>

              <div className="space-y-3 pt-1">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Nominee Full Name
                    </label>
                    <input
                      type="text"
                      value={nomineeName}
                      onChange={(e) => setNomineeName(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Relationship with Nominee
                    </label>
                    <select
                      value={nomineeRelation}
                      onChange={(e) => setNomineeRelation(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    >
                      <option value="">Select Option</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Nominee Age
                    </label>
                    <input
                      type="number"
                      value={nomineeAge}
                      onChange={(e) => setNomineeAge(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Gratuity Share Percentage (%)
                    </label>
                    <input
                      type="number"
                      max={100}
                      min={1}
                      value={nomineeShare}
                      onChange={(e) => setNomineeShare(Number(e.target.value))}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none text-zinc-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      if (!nomineeName || !nomineeRelation || !nomineeAge) {
                        setAlertMsg({ type: "error", text: "Please complete the nominee details." });
                        setTimeout(() => setAlertMsg(null), 3000);
                        return;
                      }
                      saveState({
                        nomineeName,
                        nomineeRelation,
                        nomineeAge,
                        nomineeShare,
                      });
                    }}
                    className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
                  >
                    Save Nominee (Form F)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* DETAILED PAYSLIP PDF VIEW MODAL */}
      {selectedMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Modal Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </button>
              <button
                onClick={() => setSelectedMonth(null)}
                className="rounded-lg border border-zinc-200 bg-white p-1.5 text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Payslip sheet layout */}
            <div className="space-y-6 text-zinc-800 pr-2 pt-2">
              
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b border-zinc-150">
                <h2 className="text-base font-extrabold text-zinc-950 tracking-tight uppercase">AntBox HRMS India Pvt. Ltd.</h2>
                <p className="text-[10px] text-zinc-400 font-semibold leading-none">
                  DLF Cyber City, Patia, Bhubaneswar, Odisha - 751024
                </p>
                <p className="text-xs font-bold text-zinc-800 mt-2 bg-zinc-100/50 inline-block px-3 py-1 rounded-md">
                  Payslip for the month of {selectedMonth}
                </p>
              </div>

              {/* Employee metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs border-b border-zinc-150 pb-4">
                <div className="space-y-1.5">
                  <p><span className="text-zinc-400 font-semibold">Employee Name:</span> <span className="font-bold text-zinc-950">{employee.firstName} {employee.lastName}</span></p>
                  <p><span className="text-zinc-400 font-semibold">Employee ID:</span> <span className="font-bold text-zinc-950">{employee.employeeId}</span></p>
                  <p><span className="text-zinc-400 font-semibold">Designation:</span> <span className="font-bold text-zinc-950">{employee.designation}</span></p>
                  <p><span className="text-zinc-400 font-semibold">Department:</span> <span className="font-bold text-zinc-950">{employee.department.name}</span></p>
                </div>
                <div className="space-y-1.5">
                  <p><span className="text-zinc-400 font-semibold">Universal Account No (UAN):</span> <span className="font-bold text-zinc-950 font-mono">{uan || "—"}</span></p>
                  <p><span className="text-zinc-400 font-semibold">Income Tax PAN:</span> <span className="font-bold text-zinc-950 font-mono">{employee.pan || "—"}</span></p>
                  <p><span className="text-zinc-400 font-semibold">Bank Account Number:</span> <span className="font-bold text-zinc-950 font-mono">{employee.bankAccountNo || "—"}</span></p>
                  <p><span className="text-zinc-400 font-semibold">IFSC Code:</span> <span className="font-bold text-zinc-950 font-mono">{employee.ifscCode || "—"}</span></p>
                </div>
              </div>

              {/* Salary Components Split Grid */}
              <div className="grid grid-cols-2 border border-zinc-150 rounded-lg overflow-hidden text-xs">
                
                {/* Earnings split */}
                <div className="border-r border-zinc-150 divide-y divide-zinc-100 flex flex-col">
                  <div className="bg-zinc-50/50 px-4 py-2 font-bold text-zinc-800 border-b border-zinc-150">
                    Earnings
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">Basic Salary</span>
                    <span className="font-bold text-zinc-850">₹{basic.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">House Rent Allowance (HRA)</span>
                    <span className="font-bold text-zinc-850">₹{hraVal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">Special Allowance</span>
                    <span className="font-bold text-zinc-850">₹{allowance.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 mt-auto bg-zinc-50/30 border-t border-zinc-150 font-bold">
                    <span className="text-zinc-800">Gross Earnings (A)</span>
                    <span className="text-zinc-950">₹{grossMonthly.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {/* Deductions split */}
                <div className="divide-y divide-zinc-100 flex flex-col">
                  <div className="bg-zinc-50/50 px-4 py-2 font-bold text-zinc-800 border-b border-zinc-150">
                    Deductions
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">Provident Fund (EPF Employee)</span>
                    <span className="font-bold text-zinc-850">₹{pfMonthly.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">Professional Tax (PT)</span>
                    <span className="font-bold text-zinc-850">₹{ptMonthly.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-zinc-500">Income Tax (TDS Estimate)</span>
                    <span className="font-bold text-zinc-850">₹{tdsMonthly.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between px-4 py-2.5 mt-auto bg-zinc-50/30 border-t border-zinc-150 font-bold">
                    <span className="text-zinc-800">Total Deductions (B)</span>
                    <span className="text-zinc-950">₹{(pfMonthly + ptMonthly + tdsMonthly).toLocaleString("en-IN")}</span>
                  </div>
                </div>

              </div>

              {/* Totals Summary */}
              <div className="rounded-lg bg-zinc-950 p-4 text-white flex items-center justify-between text-xs">
                <div>
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">NET MONTHLY TAKE HOME (A - B)</p>
                  <p className="text-base font-bold font-mono mt-0.5">₹{netMonthlyPay.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">REGIME DECLARED</p>
                  <p className="font-bold mt-0.5">{regime} TAX REGIME</p>
                </div>
              </div>

              {/* Net pay in words */}
              <div className="text-xs italic bg-zinc-50 border border-zinc-150 rounded px-4 py-3 text-zinc-600 flex items-start gap-1">
                <span className="font-bold text-zinc-800 shrink-0">Net Pay in Words:</span>
                <span>{numToWords(netMonthlyPay)}</span>
              </div>

              {/* Disclaimer */}
              <p className="text-[9px] text-center text-zinc-400 leading-normal">
                This is a computer-generated salary slip and does not require a physical signature. For clarifications, raise a ticket in the Grievances desk.
              </p>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
