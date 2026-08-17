"use client";

import { useEffect, useRef, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import RequireRole from "@/app/components/RequireRole";
import { useAuth } from "@/app/lib/auth-context";

type LiveFlow = {
  rowId: string;
  captured_at: string;
  source_ip: string;
  dest_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  packet_count: number;
  byte_count: number;
  flow_duration_ms: number;
  prediction: string;
  attack_type: string | null;
  risk_score: number;
  risk_level: string;
  alert_created: boolean;
};

const RISK_COLORS: Record<string, string> = {
  low: "text-teal-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const MAX_ROWS = 200;
const CYCLE_SECONDS = 5;

function LiveMonitorContent() {
  const { token } = useAuth();
  const [rows, setRows] = useState<LiveFlow[]>([]);
  const [isPaused, setIsPaused] = useState(true);
  const [status, setStatus] = useState("Stopped");
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof LiveFlow>("captured_at");
  const [sortDesc, setSortDesc] = useState(true);

  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const runningRef = useRef(false);

  async function runCycle() {
    if (!token || pausedRef.current) return;
    runningRef.current = true;
    setStatus("Capturing...");
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/predictions/live-capture?duration=${CYCLE_SECONDS}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Capture failed");
      }
      const data = await res.json();
      const capturedAt = new Date().toISOString();
      const newRows: LiveFlow[] = data.results.map((r: Omit<LiveFlow, "rowId" | "captured_at">, i: number) => ({
        ...r,
        rowId: `${capturedAt}-${i}`,
        captured_at: capturedAt,
      }));

      setRows((prev) => [...newRows, ...prev].slice(0, MAX_ROWS));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      runningRef.current = false;
      if (!pausedRef.current) {
        setStatus("Waiting for next cycle...");
        setTimeout(runCycle, 1500);
      } else {
        setStatus("Paused");
      }
    }
  }

  function toggle() {
    setIsPaused((prev) => {
      const next = !prev;
      if (!next && !runningRef.current) {
        setTimeout(runCycle, 100);
      }
      return next;
    });
  }

  useEffect(() => {
    return () => {
      pausedRef.current = true;
    };
  }, []);

  const filtered = rows.filter((r) => {
    if (protocolFilter && r.protocol !== protocolFilter) return false;
    if (severityFilter && r.risk_level !== severityFilter) return false;
    if (search) {
      const needle = search.toLowerCase();
      if (!r.source_ip.toLowerCase().includes(needle) && !r.dest_ip.toLowerCase().includes(needle)) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
  const av = a[sortKey];
  const bv = b[sortKey];
  if (av === bv) return 0;
  if (av === null) return sortDesc ? 1 : -1;
  if (bv === null) return sortDesc ? -1 : 1;
  const result = av > bv ? 1 : -1;
  return sortDesc ? -result : result;
});

  function headerClick(key: keyof LiveFlow) {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold mb-1">Live Packet Monitor</h1>
          <p className="text-gray-400 text-sm">
            {status} — {rows.length} flows captured this session
          </p>
        </div>
        <button
          onClick={toggle}
          className={`px-4 py-2 rounded text-sm font-medium ${
            isPaused ? "bg-teal-700 hover:bg-teal-600" : "bg-red-700 hover:bg-red-600"
          }`}
        >
          {isPaused ? "Start monitoring" : "Pause"}
        </button>
      </div>
      <p className="text-gray-600 text-xs mb-6">
        Requires the backend running with administrator privileges. Captures real traffic in{" "}
        {CYCLE_SECONDS}-second windows, repeating automatically while running.
      </p>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Search source/dest IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm w-56"
        />
        <select
          value={protocolFilter}
          onChange={(e) => setProtocolFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm"
        >
          <option value="">All protocols</option>
          <option value="TCP">TCP</option>
          <option value="UDP">UDP</option>
          <option value="OTHER">Other</option>
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-sm"
        >
          <option value="">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400 text-left">
            <tr>
              {([
                ["captured_at", "Time"],
                ["source_ip", "Source IP"],
                ["src_port", "Src Port"],
                ["dest_ip", "Dest IP"],
                ["dst_port", "Dst Port"],
                ["protocol", "Protocol"],
                ["packet_count", "Packets"],
                ["byte_count", "Bytes"],
                ["flow_duration_ms", "Duration (ms)"],
                ["prediction", "Classification"],
                ["attack_type", "Attack Type"],
                ["risk_score", "Risk"],
                ["risk_level", "Severity"],
                ["alert_created", "Alert"],
              ] as [keyof LiveFlow, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => headerClick(key)}
                  className="px-3 py-2 cursor-pointer select-none whitespace-nowrap hover:text-white"
                >
                  {label} {sortKey === key ? (sortDesc ? "↓" : "↑") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={14} className="px-3 py-6 text-center text-gray-500">
                  {rows.length === 0
                    ? isPaused
                      ? "Click \"Start monitoring\" to begin capturing live traffic."
                      : "Listening for traffic..."
                    : "No flows match the current filters."}
                </td>
              </tr>
            )}
            {sorted.map((r) => (
              <tr key={r.rowId} className="border-t border-gray-900">
                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                  {new Date(r.captured_at).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2">{r.source_ip}</td>
                <td className="px-3 py-2 text-gray-400">{r.src_port}</td>
                <td className="px-3 py-2">{r.dest_ip}</td>
                <td className="px-3 py-2 text-gray-400">{r.dst_port}</td>
                <td className="px-3 py-2 text-gray-400">{r.protocol}</td>
                <td className="px-3 py-2 text-gray-400">{r.packet_count}</td>
                <td className="px-3 py-2 text-gray-400">{r.byte_count.toLocaleString()}</td>
                <td className="px-3 py-2 text-gray-400">{r.flow_duration_ms}</td>
                <td className="px-3 py-2 capitalize">{r.prediction}</td>
                <td className="px-3 py-2 text-gray-400">{r.attack_type ?? "—"}</td>
                <td className="px-3 py-2">{r.risk_score}</td>
                <td className={`px-3 py-2 capitalize font-medium ${RISK_COLORS[r.risk_level]}`}>
                  {r.risk_level}
                </td>
                <td className="px-3 py-2">{r.alert_created ? "🚨" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function LiveMonitorPage() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={["soc_analyst", "admin"]}>
        <LiveMonitorContent />
      </RequireRole>
    </RequireAuth>
  );
}