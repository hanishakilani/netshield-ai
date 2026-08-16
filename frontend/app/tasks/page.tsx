"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import RequireRole from "@/app/components/RequireRole";
import { useAuth } from "@/app/lib/auth-context";

type TaskAlert = {
  id: string;
  attack_type: string | null;
  risk_level: string;
  status: string;
  created_at: string;
  flow_details: { source_ip: string | null };
};

type Notification = {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
  alert_id: string | null;
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function TasksContent() {
  const { token } = useAuth();
  const [active, setActive] = useState<TaskAlert[]>([]);
  const [completed, setCompleted] = useState<TaskAlert[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  function loadTasks() {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/mine/assigned`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setActive(data.active);
        setCompleted(data.completed);
      })
      .catch(() => {});
  }

  function loadInbox() {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/notifications/inbox`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setNotifications)
      .catch(() => {});
  }

  useEffect(() => {
    loadTasks();
    loadInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function markAllRead() {
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/notifications/mark-read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    loadInbox();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Task Tracker & Notifications</h1>
      <p className="text-gray-400 mb-8">Alerts assigned to you and recent activity</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            Active tasks <span className="text-gray-500 text-sm">({active.length})</span>
          </h2>
          {active.length === 0 && <p className="text-gray-500 text-sm">Nothing assigned to you right now.</p>}
          <div className="space-y-2">
            {active.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-900 text-sm">
                <span className={`font-medium capitalize ${RISK_COLORS[a.risk_level]}`}>{a.risk_level}</span>
                <span>{a.attack_type ?? "Unknown"}</span>
                <span className="text-gray-500">{a.flow_details.source_ip ?? "—"}</span>
                <span className="text-gray-600 text-xs capitalize">{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">
            Completed <span className="text-gray-500 text-sm">({completed.length})</span>
          </h2>
          {completed.length === 0 && <p className="text-gray-500 text-sm">No completed tasks yet.</p>}
          <div className="space-y-2">
            {completed.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-900 text-sm">
                <span className="text-gray-500">{a.attack_type ?? "Unknown"}</span>
                <span className="text-gray-500">{a.flow_details.source_ip ?? "—"}</span>
                <span className="text-gray-600 text-xs capitalize">{a.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">
            Notification inbox{" "}
            {unreadCount > 0 && <span className="text-red-400 text-sm">({unreadCount} unread)</span>}
          </h2>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-blue-400 hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>
        {notifications.length === 0 && <p className="text-gray-500 text-sm">No notifications yet.</p>}
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-center justify-between py-2 border-b border-gray-900 text-sm ${
                n.read ? "text-gray-500" : "text-gray-200"
              }`}
            >
              <span className="flex items-center gap-2">
                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                {n.message}
              </span>
              <span className="text-gray-600 text-xs">{new Date(n.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function TasksPage() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={["soc_analyst", "admin"]}>
        <TasksContent />
      </RequireRole>
    </RequireAuth>
  );
}