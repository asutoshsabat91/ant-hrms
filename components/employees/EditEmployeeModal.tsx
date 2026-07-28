"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Save, AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_JOB_ROLES } from "@/lib/jobRoles";

interface EmployeeData {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  jobRole?: string | null;
  deployedCompany: string | null;
  phone: string | null;
  personalEmail: string | null;
  gender: string | null;
  bloodGroup: string | null;
  permanentAddress: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  bankName: string | null;
  bankAccountNo: string | null;
  ifscCode: string | null;
  pan: string | null;
  uan: string | null;
  ctc: number | null;
  profilePhoto: string | null;
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeData;
  isChandrita?: boolean;
}

export function EditEmployeeModal({ isOpen, onClose, employee, isChandrita }: EditEmployeeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields State
  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [designation, setDesignation] = useState(employee.designation);
  const [jobRole, setJobRole] = useState(employee.jobRole ?? employee.designation);
  const [deployedCompany, setDeployedCompany] = useState(employee.deployedCompany ?? "");
  const [phone, setPhone] = useState(employee.phone ?? "");
  const [personalEmail, setPersonalEmail] = useState(employee.personalEmail ?? "");
  const [gender, setGender] = useState(employee.gender ?? "");
  const [bloodGroup, setBloodGroup] = useState(employee.bloodGroup ?? "");
  const [permanentAddress, setPermanentAddress] = useState(employee.permanentAddress ?? "");
  const [emergencyContact, setEmergencyContact] = useState(employee.emergencyContact ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergencyPhone ?? "");
  const [bankName, setBankName] = useState(employee.bankName ?? "");
  const [bankAccountNo, setBankAccountNo] = useState(employee.bankAccountNo ?? "");
  const [ifscCode, setIfscCode] = useState(employee.ifscCode ?? "");
  const [pan, setPan] = useState(employee.pan ?? "");
  const [uan, setUan] = useState(employee.uan ?? "");
  const [ctc, setCtc] = useState(employee.ctc ? String(employee.ctc) : "");
  const [profilePhoto, setProfilePhoto] = useState(employee.profilePhoto ?? null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload a JPG/PNG image."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Photo must be under 2MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const payload = {
      id: employee.id,
      firstName,
      lastName,
      designation: jobRole || designation,
      jobRole: jobRole || designation,
      deployedCompany: deployedCompany.trim() || null,
      phone: phone.trim() || null,
      personalEmail: personalEmail.trim() || null,
      gender: gender.trim() || null,
      bloodGroup: bloodGroup.trim() || null,
      permanentAddress: permanentAddress.trim() || null,
      emergencyContact: emergencyContact.trim() || null,
      emergencyPhone: emergencyPhone.trim() || null,
      bankName: bankName.trim() || null,
      bankAccountNo: bankAccountNo.trim() || null,
      ifscCode: ifscCode.trim() || null,
      pan: pan.trim() || null,
      uan: uan.trim() || null,
      profilePhoto,
      ...(isChandrita ? {} : { ctc: ctc ? parseFloat(ctc) : null }),
    };

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile details.");
      }

      window.location.reload();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />
      {/* Container Panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 680,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 25px 70px rgba(0,0,0,0.2)",
          padding: 24,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-zinc-900 tracking-tight">Edit Profile Info</h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
              Syncs with live Google sheet automatically
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 hover:text-zinc-600 transition"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section: Profile Photo */}
          <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
            <div className="relative h-16 w-16 rounded-full border border-zinc-200 bg-zinc-50 overflow-hidden flex-shrink-0">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400">
                  <Camera size={20} />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-700 mb-1">Profile Picture</p>
              <label className="cursor-pointer text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition inline-block">
                Upload New Photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
            </div>
          </div>

          {/* Section: Personal Info */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">1. Professional & General Info</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">First Name</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Last Name</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Job Role</label>
                <select
                  value={jobRole || designation}
                  onChange={(e) => {
                    const val = e.target.value;
                    setJobRole(val);
                    setDesignation(val);
                  }}
                  className="mt-1 flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950"
                >
                  <option value="">Select Job Role</option>
                  {ALLOWED_JOB_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Deployed Company</label>
                <Input value={deployedCompany} onChange={(e) => setDeployedCompany(e.target.value)} placeholder="e.g. Qapita, AntBox" className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Personal Email</label>
                <Input value={personalEmail} type="email" onChange={(e) => setPersonalEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Phone</label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Gender</label>
                <Input value={gender} onChange={(e) => setGender(e.target.value)} placeholder="e.g. Male, Female" className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Blood Group</label>
                <Input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="e.g. O+" className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Permanent Address</label>
              <textarea
                value={permanentAddress}
                onChange={(e) => setPermanentAddress(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-xs outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          {/* Section: Emergency Contacts */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">2. Emergency Contact</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Contact Name</label>
                <Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Contact Phone</label>
                <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Section: Banking info */}
          <div className="space-y-3 pt-2 border-t border-zinc-100">
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">3. Bank Accounts & Compliance</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Bank Name</label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Account Number</label>
                <Input value={bankAccountNo} onChange={(e) => setBankAccountNo(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">IFSC Code</label>
                <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} className="mt-1 uppercase" />
              </div>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">PAN Number</label>
                <Input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())} className="mt-1 uppercase" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">UAN Number</label>
                <Input value={uan} onChange={(e) => setUan(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          {/* Section: CTC */}
          {!isChandrita && (
            <div className="space-y-3 pt-2 border-t border-zinc-100">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">4. Compensation</h4>
              <div>
                <label className="text-[9px] font-extrabold text-zinc-500 uppercase">Annual CTC (INR)</label>
                <Input type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="e.g. 480000" className="mt-1" />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex items-center gap-1 bg-zinc-950 text-white hover:bg-zinc-800">
              <Save size={14} />
              {loading ? "Saving Profile..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(formContent, document.body);
}
