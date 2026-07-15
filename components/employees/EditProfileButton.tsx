"use client";

import { useState } from "react";
import { Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditEmployeeModal } from "./EditEmployeeModal";

interface EmployeeData {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
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

export function EditProfileButton({ employee, isChandrita }: { employee: EmployeeData; isChandrita?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 border border-zinc-200 bg-white hover:bg-zinc-50 transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
      >
        <Edit2 className="h-3.5 w-3.5 text-zinc-500" />
        <span>Edit Profile</span>
      </Button>

      <EditEmployeeModal isOpen={open} onClose={() => setOpen(false)} employee={employee} isChandrita={isChandrita} />
    </>
  );
}
