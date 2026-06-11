"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CheckCheck,
  Calendar,
  FileText,
  AlertTriangle,
  Clock,
  Star,
  Shield,
  Loader2,
  InboxIcon,
  Check,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  type: string;
  isRead: boolean;
  createdAt: string;
};

function getNotifIcon(type: string) {
  switch (type) {
    case "LEAVE_REQUEST":
      return { icon: Calendar, bg: "bg-blue-50 border-blue-200", color: "text-blue-600" };
    case "LEAVE_APPROVED":
      return { icon: Check, bg: "bg-emerald-50 border-emerald-200", color: "text-emerald-600" };
    case "LEAVE_REJECTED":
      return { icon: AlertTriangle, bg: "bg-rose-50 border-rose-200", color: "text-rose-600" };
    case "PAYSLIP_READY":
      return { icon: FileText, bg: "bg-violet-50 border-violet-200", color: "text-violet-600" };
    case "DOCUMENT_READY":
      return { icon: FileText, bg: "bg-amber-50 border-amber-200", color: "text-amber-600" };
    case "ONBOARDING_TASK":
      return { icon: Star, bg: "bg-indigo-50 border-indigo-200", color: "text-indigo-600" };
    case "GRIEVANCE_UPDATE":
      return { icon: Shield, bg: "bg-orange-50 border-orange-200", color: "text-orange-600" };
    case "ATTENDANCE_ALERT":
      return { icon: Clock, bg: "bg-cyan-50 border-cyan-200", color: "text-cyan-600" };
    default:
      return { icon: Bell, bg: "bg-zinc-100 border-zinc-200", color: "text-zinc-600" };
  }
}

function groupByDate(notifications: NotificationItem[]) {
  const groups: Record<string, NotificationItem[]> = {};
  notifications.forEach((n) => {
    const d = new Date(n.createdAt);
    let label = format(d, "d MMMM yyyy");
    if (isToday(d)) label = "Today";
    else if (isYesterday(d)) label = "Yesterday";
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications");
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to load notifications.");
      } else {
        setNotifications(payload.notifications ?? []);
      }
    } catch {
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    const ids = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (ids.length === 0) return;
    setMarkingRead(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isRead: true }),
      });
      setNotifications((current) =>
        current.map((n) => ({ ...n, isRead: true }))
      );
    } catch {
      setError("Unable to mark notifications as read.");
    } finally {
      setMarkingRead(false);
    }
  }

  async function markOneRead(id: string) {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], isRead: true }),
      });
      setNotifications((current) =>
        current.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const groups = groupByDate(notifications);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            INBOX
          </p>
          <h2 className="text-3xl font-extrabold text-zinc-950 mt-1">
            Your <span className="italic font-light text-4xl">notifications</span>.
          </h2>
          <p className="text-xs text-zinc-400 font-medium mt-1">
            Stay on top of leave requests, approvals, and system updates.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start">
          {unreadCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-3 py-1.5 text-[10px] font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingRead}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:-translate-y-0.5 transition-all duration-300 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {markingRead ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Mark all read
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            <p className="text-xs text-zinc-400 font-medium">Loading notifications…</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-5">
          <p className="text-sm font-semibold text-rose-700">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="h-16 w-16 rounded-full bg-zinc-100 flex items-center justify-center">
            <InboxIcon className="h-8 w-8 text-zinc-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-900">All caught up!</p>
            <p className="text-xs text-zinc-400 mt-1">No notifications yet. You&apos;ll see alerts here once they arrive.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([dateLabel, items]) => (
            <div key={dateLabel} className="space-y-1">
              {/* Date Group Label */}
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {dateLabel}
                </p>
                <div className="flex-1 h-px bg-zinc-100" />
              </div>

              {/* Notification Cards */}
              <div className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm divide-y divide-zinc-50">
                {items.map((notification) => {
                  const { icon: Icon, bg, color } = getNotifIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      onClick={() => !notification.isRead && markOneRead(notification.id)}
                      className={`group flex items-start gap-4 px-5 py-4 transition-all duration-200 cursor-pointer hover:bg-zinc-50/80 ${
                        !notification.isRead ? "bg-zinc-50/50" : ""
                      }`}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex-shrink-0 h-9 w-9 rounded-xl border flex items-center justify-center ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold leading-snug ${notification.isRead ? "text-zinc-700" : "text-zinc-950"}`}>
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-zinc-950" />
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap flex-shrink-0">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 font-medium mt-0.5 leading-relaxed">
                          {notification.body}
                        </p>
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-zinc-950 hover:underline uppercase tracking-wider"
                          >
                            View details
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>

                      {/* Read indicator */}
                      {notification.isRead ? (
                        <span className="flex-shrink-0 mt-1 text-[9px] font-bold text-zinc-300 uppercase tracking-wider">
                          Read
                        </span>
                      ) : (
                        <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                            Mark read
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
