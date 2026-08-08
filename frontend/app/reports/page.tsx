"use client";

import { useEffect, useState } from "react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type ThreatReport = {
  top_attack_types: { attack_type: string; count: number }[];
  top_source_ips: { source_ip: string; alert_count: number; max_risk_score: number }[];
  status_breakdown: Record<string, number>;
  risk_level_breakdown: Record<string, number>;
  total_alerts: number;
};

const STATUS_COLORS: Record<string, string> = {
  open: "#F87171",
  acknowledged: "#FBBF24",
  resolved: "#2DD4BF",
  false_positive: "#6B7280",
};

const RISK_COLORS: Record<string, string> = {
  critical: "#F87171",
  high: "#FB923C",
  medium: "#FBBF24",
  low: "#2DD4BF",
};

function ReportsContent() {
  const { token } = useAuth();
  const [report, setReport] = useState<ThreatReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/reports/threat-intelligence`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load report");
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading report...</p>
      </main>
    );
  }

  const attackTypeData = {
    labels: report.top_attack_types.map((t) => t.attack_type),
    datasets: [
      {
        label: "Alert count",
        data: report.top_attack_types.map((t) => t.count),
        backgroundColor: "#378ADD",
      },
    ],
  };

  const statusLabels = Object.keys(report.status_breakdown);
  const statusData = {
    labels: statusLabels.map((s) => s.replace("_", " ")),
    datasets: [
      {
        data: statusLabels.map((s) => report.status_breakdown[s]),
        backgroundColor: statusLabels.map((s) => STATUS_COLORS[s] ?? "#6B7280"),
        borderWidth: 0,
      },
    ],
  };

  const riskLabels = Object.keys(report.risk_level_breakdown);
  const riskData = {
    labels: riskLabels,
    datasets: [
      {
        data: riskLabels.map((r) => report.risk_level_breakdown[r]),
        backgroundColor: riskLabels.map((r) => RISK_COLORS[r] ?? "#6B7280"),
        borderWidth: 0,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Threat Intelligence Report</h1>
      <p className="text-gray-400 mb-8">Aggregated patterns across {report.total_alerts} alerts</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Top attack types</h2>
          {report.top_attack_types.length > 0 ? (
            <Bar data={attackTypeData} options={{ indexAxis: "y" as const }} />
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Alert status breakdown</h2>
          {statusLabels.length > 0 ? (
            <Doughnut data={statusData} />
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Risk level distribution</h2>
          {riskLabels.length > 0 ? (
            <Doughnut data={riskData} />
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Top source IPs</h2>
          {report.top_source_ips.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-left border-b border-gray-800">
                <tr>
                  <th className="py-2">Source IP</th>
                  <th className="py-2">Alert count</th>
                  <th className="py-2">Max risk</th>
                </tr>
              </thead>
              <tbody>
                {report.top_source_ips.map((s, i) => (
                  <tr key={i} className="border-b border-gray-900">
                    <td className="py-2">{s.source_ip}</td>
                    <td className="py-2 text-gray-400">{s.alert_count}</td>
                    <td className="py-2 text-red-400">{s.max_risk_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-sm">No data yet</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ReportsPage() {
  return (
    <RequireAuth>
      <ReportsContent />
    </RequireAuth>
  );
}