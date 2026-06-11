"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface TaskRecord {
  id: string;
  taskType: string;
  details: string;
  status: string;
  createdAt: string;
  employee: EmployeeOption | null;
}

interface ITOpsBoardProps {
  tasks: TaskRecord[];
  employees: EmployeeOption[];
}

const taskTypes = [
  { value: "ACCOUNT_CREATION", label: "Account creation" },
  { value: "ACCOUNT_DELETION", label: "Account deletion" },
  { value: "DEVICE_ALLOCATION", label: "Device allocation" },
  { value: "DEVICE_RETURN", label: "Device return" },
  { value: "SOFTWARE_ACCESS", label: "Software access" },
  { value: "SOFTWARE_REVOKE", label: "Software revoke" },
  { value: "EMAIL_CREATION", label: "Email creation" },
  { value: "EMAIL_DELETION", label: "Email deletion" },
];

export function ITOpsBoard({ tasks: initialTasks, employees }: ITOpsBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [taskType, setTaskType] = useState("ACCOUNT_CREATION");
  const [employeeId, setEmployeeId] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableEmployees = useMemo(
    () => [{ id: "", firstName: "Unassigned", lastName: "" }, ...employees],
    [employees]
  );

  async function submitTask() {
    if (!details.trim()) {
      setError("Please provide task details.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/it-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, details, employeeId: employeeId || undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to create task.");
        return;
      }
      setTasks((current) => [
        {
          id: payload.task.id,
          taskType: payload.task.taskType,
          details: payload.task.details,
          status: payload.task.status,
          createdAt: payload.task.createdAt,
          employee: payload.task.employee,
        },
        ...current,
      ]);
      setDetails("");
      setEmployeeId("");
      setSuccess("IT task queued successfully.");
    } catch {
      setError("Unable to create task.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>IT operations queue</CardTitle>
              <CardDescription>Track provisioning and access requests for onboarding and exits.</CardDescription>
            </div>
            <div className="text-sm text-[var(--neutral-500)]">{tasks.length} tasks</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Task type</label>
                <Select value={taskType} onValueChange={(value) => setTaskType(value ?? "ACCOUNT_CREATION")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>{taskTypes.find((item) => item.value === taskType)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Request for employee</label>
                <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "") }>
                  <SelectTrigger className="w-full">
                    <SelectValue>{availableEmployees.find((emp) => emp.id === employeeId)?.firstName || "Unassigned"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Details</label>
                <Textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={5} />
              </div>
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              {success && <p className="text-sm text-[var(--success)]">{success}</p>}
              <div className="flex justify-end">
                <Button onClick={submitTask} disabled={loading}>
                  {loading ? "Queueing..." : "Queue IT task"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--neutral-900)]">Recent IT tasks</h3>
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <p className="text-sm text-[var(--neutral-500)]">No tasks queued yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>{task.taskType.replace(/_/g, " ")}</TableCell>
                          <TableCell>{task.employee ? `${task.employee.firstName} ${task.employee.lastName}` : "Unassigned"}</TableCell>
                          <TableCell>{task.status}</TableCell>
                          <TableCell>{new Date(task.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
