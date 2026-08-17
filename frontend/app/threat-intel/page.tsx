"use client";

import { useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import RequireRole from "@/app/components/RequireRole";
import { useAuth } from "@/app/lib/auth-context";

type LookupResult = {
  ip_address: string;
  internal: {
    total_alerts: number;
    attack_types_seen: string[];
    max_risk_score: number;
    recent_alerts: {
      id: string;
      attack_type: string | null;
      risk_level: string;
      last_seen: string;
      status: string;
    }[];
    related_incidents: { id: string; title: string; status: string }[];
  };
  external: {
    status: string;
    note: string;
  };
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

function ThreatIntelContent() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!token || !query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/threat-intel/ip/${encodeURIComponent(query.trim())}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Lookup failed");
      }
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">Threat Intelligence</h1>
      <p className="text-gray-400 mb-6">Investigate an IP address against your alert history</p>

      <div className="flex gap-3 mb-8">
        <input
          type="text"
          placeholder="Enter an IP address, e.g. 192.168.1.7"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm flex-1 max-w-md"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Searching..." : "Investigate"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {result && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">{result.ip_address}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm">Total alerts</p>
                <p className="text-2xl font-bold">{result.internal.total_alerts}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Max risk score</p>
                <p className="text-2xl font-bold text-red-400">{result.internal.max_risk_score}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Attack types seen</p>
                <p className="text-sm mt-1">
                  {result.internal.attack_types_seen.length > 0
                    ? result.internal.attack_types_seen.join(", ")
                    : "None"}
                </p>
              </div>
            </div>

            {result.internal.related_incidents.length > 0 && (
              <div className="mb-4">
                <p className="text-gray-500 text-sm mb-1">Related incidents</p>
                {result.internal.related_incidents.map((i) => (
                  <p key={i.id} className="text-sm text-gray-300">
                    {i.title} — <span className="text-gray-500 capitalize">{i.status}</span>
                  </p>
                ))}
              </div>
            )}

            {result.internal.recent_alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No alerts on record for this IP.</p>
            ) : (
              <table className="w-full text-sm mt-4">
                <thead className="text-gray-400 text-left border-b border-gray-800">
                  <tr>
                    <th className="py-2">Attack type</th>
                    <th className="py-2">Severity</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {result.internal.recent_alerts.map((a) => (
                    <tr key={a.id} className="border-b border-gray-900">
                      <td className="py-2">{a.attack_type ?? "Unknown"}</td>
                      <td className={`py-2 capitalize font-medium ${RISK_COLORS[a.risk_level]}`}>
                        {a.risk_level}
                      </td>
                      <td className="py-2 text-gray-400 capitalize">{a.status.replace("_", " ")}</td>
                      <td className="py-2 text-gray-500">{new Date(a.last_seen).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 border-dashed">
            <h2 className="text-lg font-medium mb-2 text-gray-400">External threat intelligence</h2>
            <p className="text-gray-500 text-sm">{result.external.note}</p>
          </div>
        </div>
      )}
    </main>
  );
}

export default function ThreatIntelPage() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={["soc_analyst", "admin"]}>
        <ThreatIntelContent />
      </RequireRole>
    </RequireAuth>
  );
}