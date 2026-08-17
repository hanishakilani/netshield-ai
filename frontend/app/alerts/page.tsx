"use client";

import { useEffect, useState, useCallback } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";
import { useAlertsSocket } from "@/app/lib/alerts-socket-context";

type Alert = {
  id: string;
  created_at: string;
  last_seen: string;
  source: string;
  risk_score: number;
  risk_level: string;
  attack_type: string | null;
  status: string;
  assigned_to: string | null;
  occurrence_count: number;
  notes: { text: string; author: string; at: string }[];
  flow_details: {
    source_ip: string | null;
    dest_ip: string | null;
    src_port: number | null;
    dst_port: number | null;
    protocol: string | null;
    actual_label: string | null;
  };
};

type AssignableUser = {
  id: string;
  username: string;
  role: string;
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400 border-teal-900",
  medium: "text-yellow-400 border-yellow-900",
  high: "text-orange-400 border-orange-900",
  critical: "text-red-400 border-red-900",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  false_positive: "False Positive",
};

function AlertsContent() {
  const { token } = useAuth();
  const { lastEvent, connected } = useAlertsSocket();

  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [incidentTitle, setIncidentTitle] = useState("");

  const loadAlerts = useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (riskFilter) params.set("risk_level", riskFilter);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load alerts");
        return res.json();
      })
      .then((data) => setAlerts(data.alerts))
      .catch((err) => setError(err.message));
  }, [token, statusFilter, riskFilter]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (lastEvent) loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/assignable`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setAssignableUsers)
      .catch(() => {});
  }, [token]);

  async function updateStatus(alertId: string, status: string) {
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/${alertId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, note: noteText || null }),
    });
    setNoteText("");
    loadAlerts();
  }

  async function assignAlert(alertId: string) {
    const target = assignTarget[alertId];
    if (!token || !target) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/${alertId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ assigned_to: target }),
    });
    loadAlerts();
  }

  function toggleSelect(alertId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(alertId)) next.delete(alertId);
      else next.add(alertId);
      return next;
    });
  }

  async function createIncident() {
    if (!token || selectedIds.size === 0 || !incidentTitle.trim()) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: incidentTitle, alert_ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      setSelectedIds(new Set());
      setIncidentTitle("");
      setShowIncidentForm(false);
      window.alert("Incident created — view it on the Incidents page.");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Alert Queue</h1>
      <p className="text-gray-400 mb-6">Threat alerts generated from AI model predictions</p>

      {selectedIds.size > 0 && (
        <div className="bg-blue-950 border border-blue-800 rounded-lg p-4 mb-4 flex items-center gap-3">
          <span className="text-sm text-blue-200">{selectedIds.size} alert(s) selected</span>
          {!showIncidentForm ? (
            <button
              onClick={() => setShowIncidentForm(true)}
              className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium"
            >
              Create incident from selection
            </button>
          ) : (
            <>
              <input
                type="text"
                placeholder="Incident title"
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                className="px-2 py-1.5 rounded bg-gray-950 border border-gray-700 text-xs flex-1 max-w-xs"
              />
              <button
                onClick={createIncident}
                disabled={!incidentTitle.trim()}
                className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-xs font-medium disabled:opacity-30"
              >
                Create
              </button>
              <button
                onClick={() => setShowIncidentForm(false)}
                className="text-xs text-gray-400 hover:underline"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-6 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm"
        >
          <option value="">All risk levels</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
        </select>

        <button
          onClick={loadAlerts}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium"
        >
          Refresh
        </button>

        <span className="flex items-center gap-1 text-xs text-gray-500 self-center ml-2">
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-teal-400" : "bg-gray-600"}`} />
          {connected ? "Live updates on" : "Reconnecting..."}
        </span>
      </div>

      {!alerts && <p className="text-gray-400">Loading alerts...</p>}
      {alerts && alerts.length === 0 && (
        <p className="text-gray-500">No alerts match these filters.</p>
      )}

      <div className="space-y-3">
        {alerts?.map((alert) => {
          const isExpanded = expandedId === alert.id;
          return (
            <div
              key={alert.id}
              className={`bg-gray-900 border rounded-lg p-4 ${RISK_COLORS[alert.risk_level].split(" ")[1]}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(alert.id)}
                    onChange={() => toggleSelect(alert.id)}
                    className="w-4 h-4"
                  />
                  <div
                    className="flex items-center gap-4 cursor-pointer flex-1"
                    onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                  >
                    <span className={`font-bold uppercase text-xs px-2 py-1 rounded ${RISK_COLORS[alert.risk_level]} border`}>
                      {alert.risk_level}
                    </span>
                    <span className="font-medium">{alert.attack_type ?? "Unknown"}</span>
                    <span className="text-gray-500 text-sm">
                      {alert.flow_details.source_ip ?? "unknown source"}
                    </span>
                    {alert.occurrence_count > 1 && (
                      <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                        ×{alert.occurrence_count}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className="flex items-center gap-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : alert.id)}
                >
                  <span className="text-gray-400 text-sm">{STATUS_LABELS[alert.status]}</span>
                  <span className="text-gray-600 text-xs">
                    {new Date(alert.last_seen).toLocaleString()}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-800 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-gray-400">
                    <p>Risk score: <span className="text-white">{alert.risk_score}</span></p>
                    <p>Source: <span className="text-white">{alert.source}</span></p>
                    <p>Dest IP: <span className="text-white">{alert.flow_details.dest_ip ?? "—"}</span></p>
                    <p>Protocol: <span className="text-white">{alert.flow_details.protocol ?? "—"}</span></p>
                    <p>Assigned to: <span className="text-white">{alert.assigned_to ?? "unassigned"}</span></p>
                    <p>First seen: <span className="text-white">{new Date(alert.created_at).toLocaleString()}</span></p>
                  </div>

                  {alert.notes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-500 mb-1">Notes:</p>
                      {alert.notes.map((n, i) => (
                        <p key={i} className="text-gray-400 text-xs mb-1">
                          <span className="text-gray-300">{n.author}</span> — {n.text}{" "}
                          <span className="text-gray-600">({new Date(n.at).toLocaleString()})</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mb-3 items-center">
                    <select
                      value={assignTarget[alert.id] ?? ""}
                      onChange={(e) => setAssignTarget((prev) => ({ ...prev, [alert.id]: e.target.value }))}
                      className="px-2 py-1.5 rounded bg-gray-950 border border-gray-700 text-xs"
                    >
                      <option value="">Assign to...</option>
                      {assignableUsers.map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.username} ({u.role === "admin" ? "Admin" : "Analyst"})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => assignAlert(alert.id)}
                      disabled={!assignTarget[alert.id]}
                      className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Assign
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Add a note (optional)"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full mb-3 px-3 py-2 rounded bg-gray-950 border border-gray-700 text-sm"
                  />

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => updateStatus(alert.id, "acknowledged")}
                      className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs font-medium"
                    >
                      Acknowledge
                    </button>
                    <button
                      onClick={() => updateStatus(alert.id, "resolved")}
                      className="px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-xs font-medium"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => updateStatus(alert.id, "false_positive")}
                      className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs font-medium"
                    >
                      Mark False Positive
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default function AlertsPage() {
  return (
    <RequireAuth>
      <AlertsContent />
    </RequireAuth>
  );
}