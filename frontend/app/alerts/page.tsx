"use client";

import { useEffect, useState, useCallback } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";

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
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

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

      <div className="flex gap-3 mb-6">
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
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : alert.id)}
              >
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-4">
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