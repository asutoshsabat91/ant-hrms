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

    // Check if it's the absolute root (Rohit Singh)
    const isRoot = employee.email.toLowerCase() === "rohit@theantbox.com";
    
    // Check if node is part of active hovered path
    const isHighlighted = activePathIds.has(employee.id);

    // Determine bottom connector highlight status
    const isBottomHighlighted = isHighlighted && hoveredNodeId !== employee.id;

    // Style borders and backgrounds uniquely to denote hierarchy level and hovered state
    const cardBorderColor = isHighlighted
      ? "border-violet-500 shadow-lg shadow-violet-100 ring-2 ring-violet-200/50 scale-[1.02] z-20"
      : isRoot 
      ? "border-violet-300 shadow-violet-50/50 bg-gradient-to-br from-white to-violet-50/30" 
      : children.length > 0 
      ? "border-indigo-100 hover:border-indigo-200 bg-gradient-to-br from-white to-indigo-50/10" 
      : "border-zinc-200 hover:border-zinc-300 bg-white";

    const visibleChildren = !isCollapsed ? children : [];

    return (
      <div className="flex flex-col items-center" key={employee.id}>
        {/* Vertical line coming in from parent (not for root) */}
        {!isRoot && (
          <div className={`w-0.5 h-8 transition-colors duration-200 ${isHighlighted ? "bg-violet-500" : "bg-zinc-300"}`} />
        )}

        {/* Card Component */}
        <div 
          onMouseEnter={() => setHoveredNodeId(employee.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          className={`nocanvasdrag relative z-10 flex flex-col items-center bg-white rounded-2xl border p-4 w-56 shadow-sm hover:shadow-md transition-all duration-300 select-none group ${cardBorderColor}`}
        >
          {/* Main Card Data */}
          <div className="flex items-start gap-3 w-full">
            <Avatar className="h-10 w-10 border border-zinc-100 shrink-0">
              <AvatarFallback className="bg-zinc-950 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-zinc-950 truncate leading-tight flex items-center gap-1.5">
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
              <div className="flex items-center gap-1.5 mt-2.5 text-[9px] font-bold uppercase tracking-wider text-violet-600 bg-violet-50/50 border border-violet-100/50 px-1.5 py-0.5 rounded-md w-fit">
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

          {/* Reportees Collapse Button */}
          {children.length > 0 && (
            <button
              onClick={(e) => toggleCollapse(employee.id, e)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-full border border-zinc-200 bg-white text-[9px] font-bold text-zinc-500 shadow-sm hover:bg-zinc-50 hover:text-zinc-800 transition-all shrink-0 z-10"
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

        {/* Children Branches */}
        {visibleChildren.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Vertical stem going down from parent */}
            <div className={`w-0.5 h-8 transition-colors duration-200 ${isBottomHighlighted ? "bg-violet-500" : "bg-zinc-300"}`} />

            {visibleChildren.length === 1 ? (
              /* Single child — just pass through vertically */
              renderNode(visibleChildren[0])
            ) : (
              /* Multiple children — draw horizontal bar spanning them */
              <div className="flex flex-col items-center w-full">
                {/* Horizontal spanning bar */}
                <div className="flex items-start w-full">
                  {visibleChildren.map((child, idx) => (
                    <div key={child.employee.id} className="flex flex-col items-center flex-1">
                      {/* Left/right half segments of horizontal bar */}
                      <div className="flex w-full h-0.5">
                        <div className={`flex-1 ${idx === 0 ? "invisible" : (isBottomHighlighted ? "bg-violet-500" : "bg-zinc-300")}`} />
                        <div className={`flex-1 ${idx === visibleChildren.length - 1 ? "invisible" : (isBottomHighlighted ? "bg-violet-500" : "bg-zinc-300")}`} />
                      </div>
                      {/* Child subtree */}
                      {renderNode(child)}
                    </div>
                  ))}
                </div>
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
