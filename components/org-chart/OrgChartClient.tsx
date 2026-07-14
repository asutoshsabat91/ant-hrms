"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Minus, 
  Maximize2, 
  ChevronDown, 
  ChevronUp, 
  Building,
  Edit2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  managerId: string | null;
  profilePhoto: string | null;
  status: string;
  department: {
    name: string;
  };
}

interface OrgChartClientProps {
  isAdmin: boolean;
}

interface TreeNode {
  employee: Employee;
  children: TreeNode[];
}

export function OrgChartClient({ isAdmin }: OrgChartClientProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Load employees from API
  const fetchStructure = async () => {
    try {
      const res = await fetch("/api/employees/org-chart");
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Failed to load org chart structure", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructure();
  }, []);

  // Construct hierarchy tree
  const buildTree = (): TreeNode[] => {
    const nodeMap: Record<string, TreeNode> = {};
    const roots: TreeNode[] = [];

    // Initialize map
    employees.forEach(emp => {
      nodeMap[emp.id] = { employee: emp, children: [] };
    });

    // Populate children and find roots
    employees.forEach(emp => {
      const node = nodeMap[emp.id];
      if (emp.managerId && nodeMap[emp.managerId]) {
        nodeMap[emp.managerId].children.push(node);
      } else {
        // If no manager or manager is not in active list, it is a root
        roots.push(node);
      }
    });

    // To ensure Rohit Singh is the absolute top/head root node if he exists
    const rohitRootIdx = roots.findIndex(
      r => r.employee.email.toLowerCase() === "rohit@theantbox.com"
    );
    if (rohitRootIdx !== -1 && roots.length > 1) {
      const [rohitRoot] = roots.splice(rohitRootIdx, 1);
      // Place any other root nodes under Rohit as a fallback, or just list Rohit first
      roots.unshift(rohitRoot);
    }

    return roots;
  };

  // Toggle node collapse state
  const toggleCollapse = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 1.8));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.4));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls (mouse drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow drag on background, not on interactive cards/buttons
    if ((e.target as HTMLElement).closest(".nocanvasdrag")) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Update manager API call
  const handleUpdateManager = async (employeeId: string, managerId: string | null) => {
    setUpdatingId(employeeId);
    try {
      const res = await fetch("/api/employees/org-chart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, managerId }),
      });
      
      if (res.ok) {
        await fetchStructure();
        setEditingNodeId(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update reporting manager");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setUpdatingId(null);
    }
  };

  // Find valid potential managers to prevent cycles (cannot select self or reportees)
  const getPotentialManagers = (empId: string): Employee[] => {
    const reportees = new Set<string>();
    const nodeMap: Record<string, string[]> = {};

    employees.forEach(emp => {
      if (emp.managerId) {
        if (!nodeMap[emp.managerId]) nodeMap[emp.managerId] = [];
        nodeMap[emp.managerId].push(emp.id);
      }
    });

    const dfs = (id: string) => {
      reportees.add(id);
      const children = nodeMap[id] || [];
      children.forEach(dfs);
    };

    dfs(empId);

    // Potential managers are active employees except self and reportees
    return employees.filter(emp => !reportees.has(emp.id));
  };

  // Render a Node Card
  const renderNode = (node: TreeNode, isLast: boolean, isFirst: boolean, isSingle: boolean) => {
    const { employee, children } = node;
    const isCollapsed = !!collapsedNodes[employee.id];
    const initials = `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();

    // Check if it's the absolute root (Rohit Singh)
    const isRoot = employee.email.toLowerCase() === "rohit@theantbox.com";

    // Style variables matching modern premium UI
    const cardBorderColor = isRoot 
      ? "border-violet-500 shadow-violet-100/50" 
      : children.length > 0 
      ? "border-zinc-200 hover:border-zinc-300" 
      : "border-zinc-200 hover:border-zinc-200";

    return (
      <div className="flex flex-col items-center relative" key={employee.id}>
        {/* Top Connector Line */}
        {!isRoot && (
          <div className="w-px h-6 bg-zinc-300 relative">
            {/* Horizontal branch line handles */}
            {!isSingle && (
              <div 
                className={`absolute top-0 h-px bg-zinc-300 ${
                  isFirst ? "left-1/2 w-1/2" : isLast ? "right-1/2 w-1/2" : "left-0 w-full"
                }`}
              />
            )}
          </div>
        )}

        {/* Card Component */}
        <div className={`nocanvasdrag relative z-10 flex flex-col items-center bg-white rounded-2xl border p-4 w-60 shadow-sm hover:shadow-md transition-all duration-300 select-none group ${cardBorderColor}`}>
          
          {/* Main Card Data */}
          <div className="flex items-start gap-3 w-full">
            <Avatar className="h-10 w-10 border border-zinc-100 shrink-0">
              <AvatarFallback className="bg-zinc-900 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-zinc-950 truncate leading-tight">
                {employee.firstName} {employee.lastName}
              </h5>
              <p className="text-[10px] font-semibold text-zinc-400 truncate leading-none mt-0.5">
                {employee.designation}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-md w-fit">
                <Building className="h-2.5 w-2.5 shrink-0" />
                {employee.department.name}
              </div>
            </div>
          </div>

          {/* Edit Button overlay for admin */}
          {isAdmin && (
            <button 
              onClick={() => setEditingNodeId(editingNodeId === employee.id ? null : employee.id)}
              className="absolute top-2 right-2 p-1 rounded-md bg-zinc-50 border border-zinc-200/50 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all shadow-sm"
              title="Edit Reporting Manager"
            >
              <Edit2 className="h-2.5 w-2.5 text-zinc-500" />
            </button>
          )}

          {/* Editing State (Manager Selection Dropdown) */}
          {editingNodeId === employee.id && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-zinc-200 shadow-xl p-2.5 z-20 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
              <label className="block text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">Reports To Manager</label>
              <div className="relative">
                <select
                  disabled={updatingId === employee.id}
                  defaultValue={employee.managerId || ""}
                  onChange={(e) => handleUpdateManager(employee.id, e.target.value || null)}
                  className="w-full text-xs font-semibold text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-zinc-400 transition-colors cursor-pointer appearance-none pr-8"
                >
                  <option value="">(None - Top Level)</option>
                  {getPotentialManagers(employee.id).map(mgr => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.firstName} {mgr.lastName}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
              <button 
                onClick={() => setEditingNodeId(null)}
                className="w-full text-[9px] font-extrabold uppercase tracking-wider py-1 text-center text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Reportees Collapse Button (If children exist) */}
          {children.length > 0 && (
            <button
              onClick={(e) => toggleCollapse(employee.id, e)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full border border-zinc-200 bg-white text-[9px] font-bold text-zinc-500 shadow-sm hover:bg-zinc-50 hover:text-zinc-800 transition-all shrink-0"
            >
              {isCollapsed ? (
                <>
                  <Plus className="h-2.5 w-2.5 text-zinc-400" />
                  {children.length}
                </>
              ) : (
                <ChevronUp className="h-2.5 w-2.5 text-zinc-400" />
              )}
            </button>
          )}
        </div>

        {/* Children Branches Render */}
        {children.length > 0 && !isCollapsed && (
          <>
            {/* Line down to branch split */}
            <div className="w-px h-6 bg-zinc-300" />
            <div className="flex gap-10 justify-center items-start">
              {children.map((child, idx) => 
                renderNode(
                  child, 
                  idx === children.length - 1, 
                  idx === 0, 
                  children.length === 1
                )
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  const tree = buildTree();

  return (
    <div className="w-full h-full flex flex-col relative select-none bg-zinc-50/50">
      {/* Interactive Drag & Pan Canvas */}
      <div 
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 min-h-0 cursor-grab relative overflow-hidden flex items-center justify-center ${
          isDragging ? "cursor-grabbing" : ""
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent" />
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Loading Hierarchy...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center text-xs text-zinc-400">No active employees found.</div>
        ) : (
          <div 
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.15s ease-out",
            }}
            className="flex gap-12 p-24"
          >
            {tree.map((root) => renderNode(root, true, true, true))}
          </div>
        )}
      </div>

      {/* Floating Canvas Action Controls */}
      <div className="nocanvasdrag absolute bottom-6 right-6 flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-md p-1.5 shadow-lg">
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/50 bg-white text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
          title="Zoom Out"
        >
          <Minus className="h-4 w-4" />
        </button>
        <div className="text-[10px] font-bold text-zinc-500 px-2 select-none w-12 text-center">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/50 bg-white text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
          title="Zoom In"
        >
          <Plus className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-zinc-200 mx-1" />
        <button
          onClick={handleZoomReset}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200/50 bg-white text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-all"
          title="Center View"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Helper User instructions overlay */}
      <div className="absolute top-4 left-4 pointer-events-none select-none">
        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
          💡 Drag background to pan chart • Zoom scroll at controls below
        </p>
      </div>
    </div>
  );
}
