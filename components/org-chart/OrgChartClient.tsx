"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Plus, 
  Minus, 
  Maximize2, 
  ChevronDown, 
  ChevronUp, 
  Building,
  Edit2,
  Search as SearchIcon
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Employee {
  id: string;
  employeeId: string;
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
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(0.85);
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

  // Construct hierarchy tree starting from Rohit Singh and gather unassigned employees
  const buildHierarchy = (): { tree: TreeNode[]; unassigned: Employee[] } => {
    const nodeMap: Record<string, TreeNode> = {};

    // Initialize map
    employees.forEach(emp => {
      nodeMap[emp.id] = { employee: emp, children: [] };
    });

    // Find Rohit Singh (the absolute Root Node)
    const rohitNode = employees.find(
      e => e.email.toLowerCase() === "rohit@theantbox.com"
    );

    if (!rohitNode) {
      // Fallback if Rohit Singh is not found: treat all top level as roots
      const fallbackRoots: TreeNode[] = [];
      employees.forEach(emp => {
        const node = nodeMap[emp.id];
        if (emp.managerId && nodeMap[emp.managerId]) {
          nodeMap[emp.managerId].children.push(node);
        } else {
          fallbackRoots.push(node);
        }
      });
      return { tree: fallbackRoots, unassigned: [] };
    }

    // Populate children for all nodes
    employees.forEach(emp => {
      const node = nodeMap[emp.id];
      if (emp.managerId && nodeMap[emp.managerId]) {
        nodeMap[emp.managerId].children.push(node);
      }
    });

    // Traverse tree starting from Rohit to find all connected reportees
    const connectedIds = new Set<string>();
    const traverse = (node: TreeNode) => {
      connectedIds.add(node.employee.id);
      node.children.forEach(traverse);
    };

    const rohitTree = nodeMap[rohitNode.id];
    traverse(rohitTree);

    // Unassigned employees are those not reachable from Rohit Singh's tree
    const unassigned = employees.filter(emp => !connectedIds.has(emp.id));

    return {
      tree: [rohitTree],
      unassigned,
    };
  };

  // Memoize path from hovered node up to Rohit Singh
  const activePathIds = useMemo(() => {
    const path = new Set<string>();
    if (!hoveredNodeId) return path;
    let currentId: string | null = hoveredNodeId;
    while (currentId) {
      path.add(currentId);
      const emp = employees.find(e => e.id === currentId);
      currentId = emp ? emp.managerId : null;
    }
    return path;
  }, [hoveredNodeId, employees]);

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
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleZoomReset = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls (mouse drag)
  const handleMouseDown = (e: React.MouseEvent) => {
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

  // Find valid potential managers to prevent cycles
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

    // Potential managers can be any active employee except self or their reportees
    return employees.filter(emp => !reportees.has(emp.id));
  };

  // Render a Node Card inside the tree
  const renderNode = (node: TreeNode) => {
    const { employee, children } = node;
    const isCollapsed = !!collapsedNodes[employee.id];
    const initials = `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();

    const isRoot = employee.email.toLowerCase() === "rohit@theantbox.com";
    const isHighlighted = activePathIds.has(employee.id);
    const isBottomHighlighted = isHighlighted && hoveredNodeId !== employee.id;

    const cardBorderColor = isHighlighted
      ? "border-violet-500 shadow-lg shadow-violet-100 ring-2 ring-violet-200/50 scale-[1.02] z-20"
      : isRoot
      ? "border-violet-300 bg-gradient-to-br from-white to-violet-50/30"
      : children.length > 0
      ? "border-indigo-100 hover:border-indigo-200 bg-gradient-to-br from-white to-indigo-50/10"
      : "border-zinc-200 hover:border-zinc-300 bg-white";

    const lineColor = isHighlighted ? "bg-violet-500" : "bg-zinc-300";
    const stemColor = isBottomHighlighted ? "bg-violet-500" : "bg-zinc-300";
    const visibleChildren = !isCollapsed ? children : [];

    return (
      <div className="flex flex-col items-center" key={employee.id}>

        {/* Vertical drop from parent to this card */}
        {!isRoot && (
          <div className={`w-px h-8 transition-colors duration-200 ${lineColor}`} />
        )}

        {/* Card */}
        <div
          onMouseEnter={() => setHoveredNodeId(employee.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          onClick={(e) => { e.stopPropagation(); setSelectedEmployee(employee); setEditingNodeId(null); }}
          className={`nocanvasdrag cursor-pointer relative z-10 bg-white rounded-2xl border p-4 w-52 shadow-sm hover:shadow-md transition-all duration-300 select-none group ${cardBorderColor}`}
        >
          <div className="flex items-start gap-3 w-full">
            <Avatar className="h-10 w-10 border border-zinc-100 shrink-0">
              <AvatarFallback className="bg-zinc-950 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-zinc-950 leading-tight flex flex-wrap items-center gap-1">
                {employee.firstName} {employee.lastName}
                {isRoot && (
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 px-1 rounded border border-violet-100">
                    Head
                  </span>
                )}
              </h5>
              <p className="text-[10px] font-semibold text-zinc-400 truncate leading-none mt-1">
                {employee.designation}
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-[9px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50/50 border border-violet-100/50 px-1.5 py-0.5 rounded-md w-fit">
                <Building className="h-2.5 w-2.5 shrink-0" />
                {employee.department.name}
              </div>
            </div>
          </div>

          {/* Admin edit button */}
          {isAdmin && (
            <button
              onClick={() => setEditingNodeId(editingNodeId === employee.id ? null : employee.id)}
              className="absolute top-2 right-2 p-1 rounded-md bg-zinc-50 border border-zinc-200/50 opacity-0 group-hover:opacity-100 hover:bg-zinc-100 transition-all shadow-sm"
              title="Edit Reporting Manager"
            >
              <Edit2 className="h-2.5 w-2.5 text-zinc-500" />
            </button>
          )}

          {/* Manager selector */}
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

          {/* Collapse toggle button */}
          {children.length > 0 && (
            <button
              onClick={(e) => toggleCollapse(employee.id, e)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-2 py-0.5 rounded-full border border-zinc-200 bg-white text-[9px] font-bold text-zinc-500 shadow-sm hover:bg-zinc-50 hover:text-zinc-800 transition-all z-10"
            >
              {isCollapsed ? (
                <><Plus className="h-2.5 w-2.5 text-zinc-400" />{children.length}</>
              ) : (
                <ChevronUp className="h-2.5 w-2.5 text-zinc-400" />
              )}
            </button>
          )}
        </div>

        {/* Children subtree */}
        {visibleChildren.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical stem from card bottom to the horizontal bar */}
            <div className={`w-px h-8 transition-colors duration-200 ${stemColor}`} />

            {visibleChildren.length === 1 ? (
              renderNode(visibleChildren[0])
            ) : (
              /*
                Each child column:
                  ┌─────────────── full column width ───────────────┐
                  │  [left half bar] │ [right half bar]             │
                  │           [vertical drop]                       │
                  │               [card]                            │
                  └─────────────────────────────────────────────────┘
                  - first child: left half is transparent (nothing to left)
                  - last child: right half is transparent (nothing to right)
                  - middle children: both halves visible → continuous bar
                  All vertical drops start at the same row as the bar, creating the T-junction.
              */
              <div className="flex">
                {visibleChildren.map((child, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === visibleChildren.length - 1;
                  return (
                    <div key={child.employee.id} className="flex flex-col items-center px-4">
                      {/* Horizontal bar halves: meet at child center to form continuous line */}
                      <div className="flex w-full h-px">
                        <div className={`flex-1 h-px transition-colors duration-200 ${isFirst ? "bg-transparent" : stemColor}`} />
                        <div className={`flex-1 h-px transition-colors duration-200 ${isLast ? "bg-transparent" : stemColor}`} />
                      </div>
                      {/* Vertical drop from bar to child card */}
                      <div className={`w-px h-8 transition-colors duration-200 ${stemColor}`} />
                      {/* Recurse */}
                      {renderNode(child)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const { tree, unassigned } = buildHierarchy();

  // Filter unassigned list by search query
  const filteredUnassigned = unassigned.filter(
    emp => 
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      emp.designation.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div className="w-full h-full flex relative select-none bg-zinc-50/50">
      
      {/* Sidebar for Unassigned Employees */}
      <div className="w-80 flex-none border-r border-zinc-200 bg-white flex flex-col h-full z-10 shadow-sm">
        <div className="p-4 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-extrabold text-zinc-950 uppercase tracking-widest">
              Unassigned List
            </h4>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
              {unassigned.length} Employees
            </span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium mb-3 leading-snug">
            These employees report to no one. Assign them to Rohit or other managers to add them to the Org Chart.
          </p>
          <div className="relative flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 focus-within:border-zinc-300 transition-colors">
            <SearchIcon className="h-3.5 w-3.5 text-zinc-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder="Search unassigned..."
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full bg-transparent text-xs text-zinc-800 placeholder:text-zinc-400 outline-none"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredUnassigned.length === 0 ? (
            <div className="text-center text-xs text-zinc-400 py-8">
              {sidebarSearch ? "No matches found." : "All employees assigned! 🎉"}
            </div>
          ) : (
            filteredUnassigned.map(emp => {
              const initials = `${emp.firstName[0] || ""}${emp.lastName[0] || ""}`.toUpperCase();
              return (
                <div 
                  key={emp.id} 
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-zinc-100 hover:border-zinc-200 bg-zinc-50/30 transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-8 w-8 border border-zinc-100 shrink-0">
                      <AvatarFallback className="bg-zinc-900 text-white text-[10px] font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h5 className="text-[11px] font-bold text-zinc-950 truncate leading-tight">
                        {emp.firstName} {emp.lastName}
                      </h5>
                      <p className="text-[9px] font-semibold text-zinc-400 truncate leading-none mt-0.5">
                        {emp.designation}
                      </p>
                    </div>
                  </div>

                  {/* Quick Assignment Dropdown */}
                  {isAdmin ? (
                    <div className="relative shrink-0 select-none">
                      <select
                        disabled={updatingId === emp.id}
                        defaultValue=""
                        onChange={(e) => handleUpdateManager(emp.id, e.target.value || null)}
                        className="text-[10px] font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200/50 rounded-lg px-2 py-1 outline-none transition-colors cursor-pointer appearance-none pr-6 max-w-[100px] truncate"
                      >
                        <option value="" disabled>Assign</option>
                        {getPotentialManagers(emp.id).map(mgr => (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.firstName} {mgr.lastName}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-violet-500">
                        <ChevronDown className="h-2.5 w-2.5" />
                      </div>
                    </div>
                  ) : (
                    <span className="text-[8px] font-extrabold uppercase text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-md">
                      Read Only
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        
        {/* Helper Instructions overlay */}
        <div className="absolute top-4 left-4 pointer-events-none select-none z-10 bg-white/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-200/50 shadow-sm">
          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <span>💡 Drag background to pan chart</span>
            <span className="text-zinc-300">•</span>
            <span>Zoom scroll at controls below</span>
          </p>
        </div>

        {/* Drag & Pan Canvas */}
        <div 
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => setSelectedEmployee(null)}
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
              {tree.map((root) => renderNode(root))}
            </div>
          )}
        </div>

        {/* Employee Profile Popup */}
        {selectedEmployee && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="nocanvasdrag absolute bottom-20 left-4 z-30 w-72 bg-white rounded-2xl border border-zinc-200 shadow-2xl shadow-zinc-200/60 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {/* Header gradient band */}
            <div className="h-14 bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-500 relative">
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-2.5 right-2.5 h-6 w-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              >
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            </div>

            {/* Avatar overlapping the gradient */}
            <div className="px-5 pb-4">
              <div className="-mt-7 mb-3 flex items-end justify-between">
                <div className="h-14 w-14 rounded-xl border-2 border-white bg-zinc-950 flex items-center justify-center shadow-md">
                  {selectedEmployee.profilePhoto ? (
                    <img
                      src={selectedEmployee.profilePhoto}
                      alt={selectedEmployee.firstName}
                      className="h-full w-full rounded-xl object-cover"
                    />
                  ) : (
                    <span className="text-white text-base font-extrabold">
                      {`${selectedEmployee.firstName[0] || ""}${selectedEmployee.lastName[0] || ""}`.toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                  {selectedEmployee.department.name}
                </span>
              </div>

              {/* Name & designation */}
              <h3 className="text-sm font-extrabold text-zinc-950 leading-tight">
                {selectedEmployee.firstName} {selectedEmployee.lastName}
              </h3>
              <p className="text-[11px] font-semibold text-zinc-400 mt-0.5 mb-4">
                {selectedEmployee.designation}
              </p>

              {/* Info rows */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
                    <svg className="h-3.5 w-3.5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">Employee ID</p>
                    <p className="text-xs font-bold text-zinc-800 truncate">{selectedEmployee.employeeId}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">Office Email</p>
                    <p className="text-xs font-bold text-zinc-800 truncate">{selectedEmployee.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <Building className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400">Department</p>
                    <p className="text-xs font-bold text-zinc-800 truncate">{selectedEmployee.department.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Canvas Action Controls */}
        <div className="nocanvasdrag absolute bottom-6 right-6 flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white/80 backdrop-blur-md p-1.5 shadow-lg z-10">
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
      </div>

    </div>
  );
}
