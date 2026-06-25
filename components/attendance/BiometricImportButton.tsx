"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { BiometricImportModal } from "./BiometricImportModal";

export function BiometricImportButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-all duration-300 hover:-translate-y-0.5 shadow-sm cursor-pointer"
      >
        <Upload className="h-3.5 w-3.5 text-zinc-500" />
        Import Biometric
      </button>
      <BiometricImportModal isOpen={open} onOpenChange={setOpen} />
    </>
  );
}
