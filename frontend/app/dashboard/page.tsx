"use client";

import { useEffect, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";
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

type TrafficStats = {
  total_flows: number;
  benign_count: number;
  attack_count: number;
  attack_percentage: number;
  top_labels: { label: string; count: number }[];
};

type SamplePrediction = {
  prediction: string;
  is_attack: boolean;
  risk_score: number;
  risk_level: string;
  attack_type: string | null;
  attack_type_confidence: number | null;
  actual_label: string;
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function DashboardContent() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [predictions, setPredictions] = useState<SamplePrediction[] | null>(null);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [predictionsError, setPredictionsError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/traffic/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load traffic stats");
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

  function runPredictions() {
    if (!token) return;
    setPredictionsLoading(true);
    setPredictionsError(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/predictions/sample`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to run predictions");
        return res.json();
      })
      .then((data) => setPredictions(data.results))
      .catch((err) => setPredictionsError(err.message))
      .finally(() => setPredictionsLoading(false));
  }

  useEffect(() => {
    runPredictions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading traffic statistics...</p>
      </main>
    );
  }

  const pieData = {
    labels: ["Benign", "Attack"],
    datasets: [
      {
        data: [stats.benign_count, stats.attack_count],
        backgroundColor: ["#0F6E56", "#993C1D"],
        borderWidth: 0,
      },
    ],
  };

  const barData = {
    labels: stats.top_labels.map((item) => item.label),
    datasets: [
      {
        label: "Flow count",
        data: stats.top_labels.map((item) => item.count),
        backgroundColor: "#378ADD",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Network Monitoring Dashboard</h1>
      <p className="text-gray-400 mb-1">CICIDS2017 traffic overview</p>
      {user && (
        <p className="text-gray-600 text-sm mb-8">
          Signed in as {user.username} ({user.role})
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Total flows</p>
          <p className="text-3xl font-bold">{stats.total_flows.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Attack flows</p>
          <p className="text-3xl font-bold text-red-400">{stats.attack_count.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <p className="text-gray-400 text-sm">Attack percentage</p>
          <p className="text-3xl font-bold text-amber-400">{stats.attack_percentage}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Benign vs attack traffic</h2>
          <Pie data={pieData} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Top traffic types</h2>
          <Bar data={barData} options={{ indexAxis: "y" as const }} />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">AI model — live sample predictions</h2>
            <p className="text-gray-500 text-sm">
              10 random real flows, scored by the trained Random Forest models
            </p>
          </div>
          <button
            onClick={runPredictions}
            disabled={predictionsLoading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
          >
            {predictionsLoading ? "Running..." : "Run new predictions"}
          </button>
        </div>

        {predictionsError && <p className="text-red-400 text-sm">{predictionsError}</p>}

        {predictions && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-400 text-left border-b border-gray-800">
                <tr>
                  <th className="py-2 pr-4">Model prediction</th>
                  <th className="py-2 pr-4">Actual label</th>
                  <th className="py-2 pr-4">Risk score</th>
                  <th className="py-2 pr-4">Risk level</th>
                  <th className="py-2 pr-4">Attack type</th>
                  <th className="py-2 pr-4">Correct?</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, i) => {
                  const isCorrect =
                    (p.is_attack && p.actual_label !== "BENIGN") ||
                    (!p.is_attack && p.actual_label === "BENIGN");
                  return (
                    <tr key={i} className="border-b border-gray-900">
                      <td className="py-2 pr-4 capitalize">{p.prediction}</td>
                      <td className="py-2 pr-4 text-gray-400">{p.actual_label}</td>
                      <td className="py-2 pr-4">{p.risk_score}</td>
                      <td className={`py-2 pr-4 capitalize font-medium ${RISK_COLORS[p.risk_level]}`}>
                        {p.risk_level}
                      </td>
                      <td className="py-2 pr-4 text-gray-400">{p.attack_type ?? "—"}</td>
                      <td className="py-2 pr-4">{isCorrect ? "✅" : "❌"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}