"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import RequireRole from "@/app/components/RequireRole";
import { useAuth } from "@/app/lib/auth-context";

type Incident = {
  id: string;
  title: string;
  severity: string;
  attack_category: string;
  affected_ips: string[];
  related_alert_ids: string[];
  status: string;
  assigned_to: string | null;
  first_detected: string;
  last_detected: string;
  created_by: string;
  timeline: { event: string; author: string; at: string }[];
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const STATUS_OPTIONS = ["open", "investigating", "contained", "resolved", "closed"];

function IncidentsContent() {
  const { token } = useAuth();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadIncidents() {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setIncidents(data.incidents))
      .catch(() => {});
  }

  useEffect(() => {
    loadIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function changeStatus(incidentId: string, status: string) {
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/incidents/${incidentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    loadIncidents();
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Incident Management</h1>
      <p className="text-gray-400 mb-8">Grouped alerts representing related attack activity</p>

      {!incidents && <p className="text-gray-400">Loading incidents...</p>}
      {incidents && incidents.length === 0 && (
        <p className="text-gray-500">
          No incidents yet — select alerts on the Alerts page and click &quot;Create incident from selection.&quot;
        </p>
      )}

      <div className="space-y-3">
        {incidents?.map((inc) => {
          const isExpanded = expandedId === inc.id;
          return (
            <div key={inc.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : inc.id)}
              >
                <div className="flex items-center gap-4">
                  <span className={`font-bold uppercase text-xs ${RISK_COLORS[inc.severity]}`}>
                    {inc.severity}
                  </span>
                  <span className="font-medium">{inc.title}</span>
                  <span className="text-gray-500 text-sm">{inc.attack_category}</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">
                    {inc.related_alert_ids.length} alert(s)
                  </span>
                </div>
                <span className="text-gray-400 text-sm capitalize">{inc.status}</span>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-800 text-sm">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 text-gray-400">
                    <p>Affected IPs: <span className="text-white">{inc.affected_ips.join(", ") || "—"}</span></p>
                    <p>First detected: <span className="text-white">{new Date(inc.first_detected).toLocaleString()}</span></p>
                    <p>Last detected: <span className="text-white">{new Date(inc.last_detected).toLocaleString()}</span></p>
                    <p>Created by: <span className="text-white">{inc.created_by}</span></p>
                    <p>Assigned to: <span className="text-white">{inc.assigned_to ?? "unassigned"}</span></p>
                  </div>

                  <p className="text-gray-500 mb-1">Timeline:</p>
                  <div className="mb-4 space-y-1">
                    {inc.timeline.map((t, i) => (
                      <p key={i} className="text-gray-400 text-xs">
                        <span className="text-gray-300">{t.author}</span> — {t.event}{" "}
                        <span className="text-gray-600">({new Date(t.at).toLocaleString()})</span>
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => changeStatus(inc.id, s)}
                        disabled={inc.status === s}
                        className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-xs font-medium capitalize disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {s}
                      </button>
                    ))}
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

export default function IncidentsPage() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={["soc_analyst", "admin"]}>
        <IncidentsContent />
      </RequireRole>
    </RequireAuth>
  );
}