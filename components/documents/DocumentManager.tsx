"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface DocumentRecord {
  id: string;
  title: string;
  type: string;
  issuedDate: string;
  description: string | null;
  employee: EmployeeOption;
}

interface DocumentManagerProps {
  documents: DocumentRecord[];
  employees: EmployeeOption[];
}

const documentTypes = [
  { value: "OFFER_LETTER", label: "Offer Letter" },
  { value: "RELIEVING_LETTER", label: "Relieving Letter" },
  { value: "EXPERIENCE_LETTER", label: "Experience Letter" },
  { value: "LOR", label: "Letter of Recommendation" },
  { value: "APPOINTMENT_LETTER", label: "Appointment Letter" },
  { value: "OTHER", label: "Other" },
];

export function DocumentManager({ documents: initialDocuments, employees }: DocumentManagerProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [type, setType] = useState("OFFER_LETTER");
  const [title, setTitle] = useState("");
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submitDocument() {
    if (!title.trim()) {
      setError("Please enter a document title.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, type, title, issuedDate, description }),
      });
      const payload = await response.json();
      if (!response.ok) {
        let errorMsg = "Unable to create document.";
        if (payload.error) {
          if (typeof payload.error === "string") {
            errorMsg = payload.error;
          } else if (typeof payload.error === "object") {
            if (payload.error.fieldErrors) {
              const fields = Object.entries(payload.error.fieldErrors)
                .map(([field, msgs]) => {
                  const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
                  return `${fieldName}: ${(msgs as string[]).join(", ")}`;
                })
                .join("; ");
              if (fields) errorMsg = fields;
            } else if (payload.error.formErrors && Array.isArray(payload.error.formErrors) && payload.error.formErrors.length > 0) {
              errorMsg = payload.error.formErrors.join(", ");
            } else if (payload.error.message) {
              errorMsg = payload.error.message;
            } else {
              errorMsg = JSON.stringify(payload.error);
            }
          }
        }
        setError(errorMsg);
        return;
      }
      setDocuments((current) => [
        {
          id: payload.document.id,
          title: payload.document.title,
          type: payload.document.type,
          issuedDate: payload.document.issuedDate,
          description: payload.document.description,
          employee: payload.document.employee,
        },
        ...current,
      ]);
      setTitle("");
      setDescription("");
      setSuccess("Document record created.");
    } catch {
      setError("Unable to create document.");
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
              <CardTitle>Document generation</CardTitle>
              <CardDescription>Issue and track HR documents for employees.</CardDescription>
            </div>
            <div className="text-sm text-[var(--neutral-500)]">{documents.length} records</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Employee</label>
                <Select value={employeeId} onValueChange={(value) => setEmployeeId(value ?? "") }>
                  <SelectTrigger className="w-full">
                    <SelectValue>{employees.find((emp) => emp.id === employeeId)?.firstName ?? "Select employee"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Document type</label>
                <Select value={type} onValueChange={(value) => setType(value ?? "OFFER_LETTER") }>
                  <SelectTrigger className="w-full">
                    <SelectValue>{documentTypes.find((item) => item.value === type)?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Title</label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Issued date</label>
                <Input type="date" value={issuedDate} onChange={(event) => setIssuedDate(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Notes</label>
                <Textarea value={description} rows={4} onChange={(event) => setDescription(event.target.value)} />
              </div>
              {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              {success && <p className="text-sm text-[var(--success)]">{success}</p>}
              <div className="flex justify-end">
                <Button onClick={submitDocument} disabled={loading || !employeeId}>
                  {loading ? "Saving..." : "Create document"}
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
              <h3 className="mb-3 text-sm font-semibold text-[var(--neutral-900)]">Latest documents</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Issued</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>{document.title}</TableCell>
                      <TableCell>{document.type.replace(/_/g, " ")}</TableCell>
                      <TableCell>{document.employee.firstName} {document.employee.lastName}</TableCell>
                      <TableCell>{new Date(document.issuedDate).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
