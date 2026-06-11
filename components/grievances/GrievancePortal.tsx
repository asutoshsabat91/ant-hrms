"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface GrievanceRecord {
  id: string;
  ticketNo: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  isAnonymous: boolean;
}

interface CommentRecord {
  id: string;
  content: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  isInternal: boolean;
}

interface DetailedGrievance {
  id: string;
  ticketNo: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  isAnonymous: boolean;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  comments: CommentRecord[];
  employeeName: string;
}

interface GrievancePortalProps {
  userRole: string;
  grievances: GrievanceRecord[];
}

const priorityOptions = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const categoryOptions = [
  { value: "POSH & Harassment", label: "POSH & Harassment" },
  { value: "Salary & Benefits", label: "Salary & Benefits" },
  { value: "Colleague Conflict", label: "Colleague Conflict" },
  { value: "Workplace Amenities", label: "Workplace Amenities" },
  { value: "Appraisal / Performance", label: "Appraisal / Performance" },
  { value: "Policy & Leave", label: "Policy & Leave" },
  { value: "Other", label: "Other" },
];

export function GrievancePortal({ userRole, grievances: initialGrievances }: GrievancePortalProps) {
  const [grievances, setGrievances] = useState<GrievanceRecord[]>(initialGrievances);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Detail panel state
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [detailedTicket, setDetailedTicket] = useState<DetailedGrievance | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const isHrOrAdmin = ["HR_ADMIN", "SUPER_ADMIN"].includes(userRole);

  const fetchDetailedTicket = useCallback(async (ticketId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/grievances/${ticketId}`);
      if (response.ok) {
        const payload = await response.json();
        setDetailedTicket(payload.grievance);
        setResolutionText(payload.grievance.resolution || "");
        setSelectedStatus(payload.grievance.status);
      }
    } catch (err) {
      console.error("Failed to load ticket details", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      fetchDetailedTicket(selectedTicketId);
    } else {
      setDetailedTicket(null);
    }
  }, [selectedTicketId, fetchDetailedTicket]);

  const submitGrievance = async () => {
    if (!subject.trim() || !category || !description.trim()) {
      setError("Please complete all grievance fields.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, description, priority, isAnonymous }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to submit grievance.");
        return;
      }
      const newRecord = {
        id: payload.grievance.id,
        ticketNo: payload.grievance.ticketNo,
        subject: payload.grievance.subject,
        category: payload.grievance.category,
        priority: payload.grievance.priority,
        status: payload.grievance.status,
        createdAt: payload.grievance.createdAt,
        isAnonymous: payload.grievance.isAnonymous,
      };
      setGrievances((current) => [newRecord, ...current]);
      setSubject("");
      setCategory("Other");
      setDescription("");
      setPriority("MEDIUM");
      setIsAnonymous(false);
      setSuccess("Your grievance has been submitted.");
    } catch {
      setError("Unable to submit grievance.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicketId) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/grievances/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          resolution: resolutionText,
          comment: commentText,
        }),
      });

      if (response.ok) {
        // Refresh details
        await fetchDetailedTicket(selectedTicketId);
        setCommentText("");
        
        // Update item in the list
        setGrievances((current) =>
          current.map((item) =>
            item.id === selectedTicketId
              ? { ...item, status: selectedStatus }
              : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !selectedTicketId) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/grievances/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: commentText,
        }),
      });

      if (response.ok) {
        await fetchDetailedTicket(selectedTicketId);
        setCommentText("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    setActionLoading(true);

    try {
      const response = await fetch(`/api/grievances/${selectedTicketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
        }),
      });

      if (response.ok) {
        await fetchDetailedTicket(selectedTicketId);
        setSelectedStatus("CLOSED");
        setGrievances((current) =>
          current.map((item) =>
            item.id === selectedTicketId
              ? { ...item, status: "CLOSED" }
              : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case "CRITICAL":
        return "bg-red-500 text-white";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MEDIUM":
        return "bg-zinc-800 text-white";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "bg-green-100 text-green-800";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-800";
      case "ESCALATED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-zinc-100 text-zinc-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit grievance ticket</CardTitle>
              <CardDescription>File a ticket with HR. You can opt to submit anonymously.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Subject</label>
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short title of grievance" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Category</label>
                  <Select value={category} onValueChange={(value) => setCategory(value ?? "Other")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{category}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Priority</label>
                  <Select value={priority} onValueChange={(value) => setPriority(value ?? "MEDIUM")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>{priority}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {priorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--neutral-700)]">Description</label>
                <Textarea value={description} rows={4} onChange={(event) => setDescription(event.target.value)} placeholder="Provide full details of the incident or complaint..." />
              </div>
              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 text-sm text-[var(--neutral-700)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(event) => setIsAnonymous(event.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border)] bg-white text-[var(--brand-primary)]"
                  />
                  Submit anonymously (Hides name from HR)
                </label>
                <Button onClick={submitGrievance} disabled={loading}>
                  {loading ? "Submitting..." : "Submit ticket"}
                </Button>
              </div>
              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
              {success && <p className="text-sm text-[var(--success)]">{success}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Grievance list</CardTitle>
                <Badge variant="outline">{grievances.length} tickets</Badge>
              </div>
              <CardDescription>Click a ticket to view conversation or update status.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-xl border border-[var(--card-border)] bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grievances.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-[var(--neutral-400)] py-8">
                          No grievances reported yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      grievances.map((ticket) => (
                        <TableRow
                          key={ticket.id}
                          className={`cursor-pointer hover:bg-zinc-50 ${selectedTicketId === ticket.id ? "bg-zinc-100/70" : ""}`}
                          onClick={() => setSelectedTicketId(ticket.id)}
                        >
                          <TableCell className="font-semibold text-xs">{ticket.ticketNo}</TableCell>
                          <TableCell className="max-w-[150px] truncate text-sm">{ticket.subject}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(ticket.status)} variant="secondary">
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(ticket.priority)}>
                              {ticket.priority}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Detail Panel */}
        <div className="space-y-6">
          <Card className="h-full flex flex-col min-h-[500px]">
            <CardHeader>
              <CardTitle>Ticket workspace</CardTitle>
              <CardDescription>View timeline updates, comments, and HR resolutions.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between">
              {!selectedTicketId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <p className="text-sm text-[var(--neutral-500)]">Select a grievance ticket from the list to view conversations, comments, and resolution states.</p>
                </div>
              ) : loadingDetail ? (
                <div className="flex-1 flex items-center justify-center py-20">
                  <div className="flex items-center gap-3 text-[var(--neutral-500)]">
                    <span className="h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                    <span>Loading ticket workspace...</span>
                  </div>
                </div>
              ) : detailedTicket ? (
                <div className="space-y-6 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h3 className="font-bold text-lg text-zinc-900">{detailedTicket.ticketNo}</h3>
                        <p className="text-xs text-[var(--neutral-500)]">Category: {detailedTicket.category} | Created {new Date(detailedTicket.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getStatusColor(detailedTicket.status)}>{detailedTicket.status}</Badge>
                        <Badge className={getPriorityColor(detailedTicket.priority)}>{detailedTicket.priority}</Badge>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Subject</p>
                      <p className="text-sm font-semibold text-zinc-800">{detailedTicket.subject}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Filer</p>
                      <p className="text-sm text-zinc-800">{detailedTicket.employeeName}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Details</p>
                      <div className="rounded-lg border bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap">
                        {detailedTicket.description}
                      </div>
                    </div>

                    {detailedTicket.resolution && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">HR Resolution Summary</p>
                        <div className="rounded-lg border border-green-200 bg-green-50/70 p-3 text-sm text-green-900">
                          {detailedTicket.resolution}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 border-t pt-4">
                      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Conversation & Activity</p>
                      <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                        {detailedTicket.comments.length === 0 ? (
                          <p className="text-xs text-zinc-400 italic">No comments or activity logs recorded yet.</p>
                        ) : (
                          detailedTicket.comments.map((comment) => (
                            <div key={comment.id} className="rounded-lg border p-2.5 bg-zinc-50/50 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-zinc-700">{comment.authorName}</span>
                                <Badge variant="outline" className="text-[10px] py-0">{comment.authorRole}</Badge>
                              </div>
                              <p className="text-xs text-zinc-600">{comment.content}</p>
                              <p className="text-[10px] text-zinc-400 text-right">{new Date(comment.createdAt).toLocaleString()}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="border-t pt-4 mt-6 space-y-4 bg-white">
                    {isHrOrAdmin ? (
                      <div className="space-y-3 p-3 rounded-xl border border-zinc-100 bg-zinc-50/40">
                        <p className="text-xs font-bold text-zinc-700">HR Administration Actions</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-zinc-500">Ticket Status</label>
                            <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val || "")}>
                              <SelectTrigger className="h-8 text-xs bg-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OPEN">Open</SelectItem>
                                <SelectItem value="UNDER_REVIEW">Under Review</SelectItem>
                                <SelectItem value="ESCALATED">Escalated</SelectItem>
                                <SelectItem value="RESOLVED">Resolved</SelectItem>
                                <SelectItem value="CLOSED">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500">Resolution Summary (Optional)</label>
                          <Textarea
                            rows={2}
                            className="text-xs bg-white"
                            placeholder="Write the resolution steps or findings..."
                            value={resolutionText}
                            onChange={(e) => setResolutionText(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-zinc-500">Post Comment / Internal Note</label>
                          <Textarea
                            rows={2}
                            className="text-xs bg-white"
                            placeholder="Write comment or updates..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button size="sm" onClick={handleUpdateTicket} disabled={actionLoading}>
                            {actionLoading ? "Updating..." : "Save Actions & Comments"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {detailedTicket.status !== "CLOSED" && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-zinc-500">Post Reply</label>
                            <Textarea
                              rows={2}
                              className="text-xs"
                              placeholder="Add feedback or reply to HR..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                            />
                            <div className="flex justify-between items-center">
                              <Button variant="outline" size="sm" onClick={handleCloseTicket} disabled={actionLoading} className="text-xs">
                                Close Ticket
                              </Button>
                              <Button size="sm" onClick={handleAddComment} disabled={actionLoading || !commentText.trim()} className="text-xs">
                                {actionLoading ? "Sending..." : "Submit Reply"}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
