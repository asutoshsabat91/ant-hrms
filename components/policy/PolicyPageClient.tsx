"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, AlertCircle, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface LeaveType {
  id: string;
  name: string;
  code: string;
  daysPerYear: number;
  accrual: string;
  priorNoticeHours: number;
  applicableTo: string[];
  isPaid: boolean;
}

interface PolicyPageClientProps {
  isSuperAdmin: boolean;
  initialLeaveTypes: LeaveType[];
}

const EMPLOYMENT_TYPES = [
  { label: "Full Time", value: "FULL_TIME" },
  { label: "Part Time", value: "PART_TIME" },
  { label: "Intern", value: "INTERN" },
  { label: "Contract", value: "CONTRACT" },
];

const ACCRUAL_OPTIONS = [
  { label: "Annual", value: "ANNUAL" },
  { label: "Quarterly", value: "QUARTERLY" },
  { label: "Monthly", value: "MONTHLY" },
  { label: "None (Unlimited/Special)", value: "NONE" },
];

export function PolicyPageClient({ isSuperAdmin, initialLeaveTypes }: PolicyPageClientProps) {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(initialLeaveTypes);
  const router = useRouter();

  // Edit / Add Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<Partial<LeaveType> | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingType({
      name: "",
      code: "",
      daysPerYear: 12,
      accrual: "ANNUAL",
      priorNoticeHours: 0,
      applicableTo: ["FULL_TIME"],
      isPaid: true,
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (lt: LeaveType) => {
    setEditingType(lt);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSave = async (savedType: Partial<LeaveType>) => {
    if (!savedType.name || !savedType.code) {
      setErrorMsg("Name and Code are required.");
      return;
    }
    if (!savedType.applicableTo || savedType.applicableTo.length === 0) {
      setErrorMsg("Must select at least one applicable employment type.");
      return;
    }

    setSaveLoading(true);
    setErrorMsg(null);

    const isEdit = !!savedType.id;
    const method = isEdit ? "PUT" : "POST";
    const url = "/api/config/leave-policy";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedType),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save leave type");
      }

      // Refresh list
      const freshRes = await fetch("/api/leave");
      const freshData = await freshRes.json();
      if (freshData?.leaveTypes) {
        setLeaveTypes(freshData.leaveTypes);
      } else {
        router.refresh();
      }

      setModalOpen(false);
      setEditingType(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      setErrorMsg(msg);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/config/leave-policy?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete leave type");
      }

      // Refresh list
      const freshRes = await fetch("/api/leave");
      const freshData = await freshRes.json();
      if (freshData?.leaveTypes) {
        setLeaveTypes(freshData.leaveTypes);
      } else {
        router.refresh();
      }
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not delete leave type.";
      alert(msg);
    }
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-zinc-950">Active Leave Policies</h3>
          <p className="text-xs text-zinc-400 font-medium mt-0.5">
            {isSuperAdmin
              ? "Configure custom leave types, allocations, accrual rates, and notice periods."
              : "View active leave limits, accruals, and application rules."}
          </p>
        </div>
        {isSuperAdmin && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus size={14} /> Add Leave Type
          </button>
        )}
      </div>

      {/* Special Exemption Alert */}
      <div className="flex gap-3 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-zinc-700">
        <Info size={18} className="text-zinc-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-zinc-950">Special Policy Exemption: Unpaid Interns</h4>
          <p className="text-xs text-zinc-600 leading-relaxed">
            Employees hired as <strong className="text-zinc-950">Interns</strong> who have a CTC of <strong>0</strong> or <strong>null</strong> are classified as Unpaid Interns. 
            They are granted <strong className="text-zinc-950">Unlimited Leaves</strong> and are exempt from all prior notice period requirements.
          </p>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Name (Code)</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Days / Year</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Accrual Frequency</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Prior Notice</th>
                <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Applicable Roles</th>
                {isSuperAdmin && <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {leaveTypes.map((lt) => (
                <tr key={lt.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="p-3 text-sm font-semibold text-zinc-900">
                    {lt.name}{" "}
                    <span className="text-[10px] font-mono text-zinc-400 font-normal">({lt.code})</span>
                    {!lt.isPaid && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm font-medium text-zinc-600">
                    {lt.daysPerYear} day{lt.daysPerYear === 1 ? "" : "s"}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      lt.accrual === "ANNUAL"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : lt.accrual === "QUARTERLY"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : lt.accrual === "MONTHLY"
                        ? "bg-pink-50 text-pink-700 border-pink-200"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}>
                      {lt.accrual}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium text-zinc-600">
                    {lt.priorNoticeHours > 0 ? `${lt.priorNoticeHours} hr(s)` : "None"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {lt.applicableTo.map((role) => (
                        <span
                          key={role}
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            role === "FULL_TIME"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : role === "INTERN"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-zinc-50 text-zinc-600 border-zinc-200"
                          }`}
                        >
                          {role.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </td>
                  {isSuperAdmin && (
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(lt)}
                          className="p-1 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-950 rounded transition cursor-pointer"
                          title="Edit policy"
                        >
                          <Edit size={14} />
                        </button>
                        {deleteConfirmId === lt.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                            <span>Sure?</span>
                            <button
                              onClick={() => handleDelete(lt.id)}
                              className="hover:underline text-red-800 ml-1 cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="hover:underline text-zinc-500 ml-1 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(lt.id)}
                            className="p-1 hover:bg-zinc-100 text-zinc-500 hover:text-red-600 rounded transition cursor-pointer"
                            title="Delete policy"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {leaveTypes.length === 0 && (
                <tr>
                  <td colSpan={isSuperAdmin ? 6 : 5} className="p-6 text-center text-sm text-zinc-400 font-medium">
                    No leave policies configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Optimized Edit / Create Policy Modal */}
      {modalOpen && editingType && (
        <LeavePolicyModal
          editingType={editingType}
          onClose={() => {
            setModalOpen(false);
            setEditingType(null);
          }}
          onSave={handleSave}
          saveLoading={saveLoading}
          errorMsg={errorMsg}
        />
      )}
    </div>
  );
}

// Child Modal Component with isolated local state to ensure lag-free typing input performance
function LeavePolicyModal({
  editingType,
  onClose,
  onSave,
  saveLoading,
  errorMsg,
}: {
  editingType: Partial<LeaveType>;
  onClose: () => void;
  onSave: (data: Partial<LeaveType>) => Promise<void>;
  saveLoading: boolean;
  errorMsg: string | null;
}) {
  const [localType, setLocalType] = useState<Partial<LeaveType>>(editingType);

  const handleToggleApplicable = (val: string) => {
    const current = localType.applicableTo || [];
    if (current.includes(val)) {
      setLocalType({
        ...localType,
        applicableTo: current.filter((x) => x !== val),
      });
    } else {
      setLocalType({
        ...localType,
        applicableTo: [...current, val],
      });
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "100%",
          maxWidth: 440,
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div className="border-b border-zinc-100 pb-3 mb-4">
          <h3 className="text-base font-bold text-zinc-950">
            {localType.id ? "Edit Leave Policy" : "Create Leave Policy"}
          </h3>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mt-0.5">
            {localType.id ? "Modify configuration details" : "Add a new dynamic leave type"}
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(localType);
          }}
          className="space-y-4"
        >
          {/* Name */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Policy Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Earned Leave"
              value={localType.name || ""}
              onChange={(e) => setLocalType({ ...localType, name: e.target.value })}
              className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-medium focus:outline-none text-zinc-900"
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Code</label>
            <input
              type="text"
              required
              disabled={!!localType.id}
              placeholder="e.g. EARNED"
              value={localType.code || ""}
              onChange={(e) => setLocalType({ ...localType, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
              className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-mono font-semibold focus:outline-none disabled:bg-zinc-50 disabled:text-zinc-400 text-zinc-900"
            />
            {!localType.id && (
              <p className="text-[9px] text-zinc-400 mt-1 font-medium">
                Use uppercase characters (e.g. FLOATER). This is used internally for balance check code.
              </p>
            )}
          </div>

          {/* Days & Accrual */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Days Per Year</label>
              <input
                type="number"
                min="0"
                required
                value={localType.daysPerYear ?? 0}
                onChange={(e) => setLocalType({ ...localType, daysPerYear: parseInt(e.target.value) || 0 })}
                className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-semibold focus:outline-none text-zinc-900"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Accrual Frequency</label>
              <select
                value={localType.accrual || "ANNUAL"}
                onChange={(e) => setLocalType({ ...localType, accrual: e.target.value })}
                className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-medium focus:outline-none text-zinc-900"
              >
                {ACCRUAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notice Period */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Prior Notice Constraint (Hours)</label>
            <input
              type="number"
              min="0"
              required
              placeholder="e.g. 24 for 24-hr advance notice"
              value={localType.priorNoticeHours ?? 0}
              onChange={(e) => setLocalType({ ...localType, priorNoticeHours: parseInt(e.target.value) || 0 })}
              className="w-full border border-zinc-200 rounded-lg p-2 text-sm font-semibold focus:outline-none text-zinc-900"
            />
            <p className="text-[9px] text-zinc-400 mt-1 font-medium">
              Enter 0 to disable prior notice constraint. (e.g. 24 requires applying 24 hrs prior to start).
            </p>
          </div>

          {/* Applicable Employment Types */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Applicable Employee Categories</label>
            <div className="grid grid-cols-2 gap-2">
              {EMPLOYMENT_TYPES.map((type) => {
                const isChecked = localType.applicableTo?.includes(type.value) || false;
                return (
                  <label
                    key={type.value}
                    className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2 cursor-pointer hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleApplicable(type.value)}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-0"
                    />
                    {type.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Paid Status */}
          <div>
            <label className="flex items-center gap-2 border border-zinc-200 rounded-lg p-2.5 cursor-pointer hover:bg-zinc-50 text-xs font-semibold text-zinc-800">
              <input
                type="checkbox"
                checked={localType.isPaid ?? true}
                onChange={(e) => setLocalType({ ...localType, isPaid: e.target.checked })}
                className="rounded border-zinc-300 text-zinc-950 focus:ring-0"
              />
              Paid Leave Type
            </label>
          </div>

          {/* Error messages */}
          {errorMsg && (
            <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 text-zinc-700 font-bold text-xs rounded-lg hover:bg-zinc-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveLoading}
              className="px-4 py-2 bg-zinc-900 text-white font-bold text-xs rounded-lg hover:bg-zinc-800 transition disabled:opacity-50 cursor-pointer"
            >
              {saveLoading ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
