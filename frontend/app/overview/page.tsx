"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";

type TrafficStats = {
  total_flows: number;
  attack_percentage: number;
};

type Alert = {
  id: string;
  risk_level: string;
  attack_type: string | null;
  last_seen: string;
  flow_details: { source_ip: string | null };
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function OverviewContent() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/traffic/stats`)
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/?limit=5`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAlerts(data.alerts))
      .catch(() => {});
  }, [token]);

  const overallRisk =
    stats && stats.attack_percentage > 15 ? "high" : stats && stats.attack_percentage > 5 ? "medium" : "low";

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Security Overview</h1>
      <p className="text-gray-400 mb-8">Welcome back, {user?.username}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Network security status</p>
          <p className={`text-3xl font-bold capitalize ${RISK_COLORS[overallRisk]}`}>{overallRisk} risk</p>
          <p className="text-gray-600 text-xs mt-2">
            Based on {stats?.total_flows.toLocaleString() ?? "…"} analyzed flows
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm mb-1">Your account</p>
          <p className="text-lg font-medium">{user?.username}</p>
          <p className="text-gray-600 text-xs mt-1 capitalize">Role: {user?.role}</p>
          <Link href="/profile" className="text-blue-400 text-xs hover:underline mt-2 inline-block">
            View profile →
          </Link>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-medium mb-4">Recent security alerts</h2>
        {!alerts && <p className="text-gray-500 text-sm">Loading...</p>}
        {alerts && alerts.length === 0 && (
          <p className="text-gray-500 text-sm">No active alerts right now.</p>
        )}
        <div className="space-y-2">
          {alerts?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-2 border-b border-gray-900 text-sm"
            >
              <span className={`font-medium capitalize ${RISK_COLORS[a.risk_level]}`}>
                {a.risk_level}
              </span>
              <span className="text-gray-300">{a.attack_type ?? "Unknown"}</span>
              <span className="text-gray-500">{a.flow_details.source_ip ?? "—"}</span>
              <span className="text-gray-600 text-xs">{new Date(a.last_seen).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function OverviewPage() {
  return (
    <RequireAuth>
      <OverviewContent />
    </RequireAuth>
  );
}