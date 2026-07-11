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

function DashboardContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/traffic/stats`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load traffic stats");
        return res.json();
      })
      .then(setStats)
      .catch((err) => setError(err.message));
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Benign vs attack traffic</h2>
          <Pie data={pieData} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Top traffic types</h2>
          <Bar data={barData} options={{ indexAxis: "y" as const }} />
        </div>
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