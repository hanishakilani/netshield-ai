"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { useAlertsSocket } from "@/app/lib/alerts-socket-context";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const { lastEvent, connected } = useAlertsSocket();
  const [openAlertCount, setOpenAlertCount] = useState<number | null>(null);

  function fetchCounts() {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/alerts/counts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setOpenAlertCount(data.open);
      })
      .catch(() => {});
  }

  useEffect(() => {
    if (!token) {
      setOpenAlertCount(null);
      return;
    }
    fetchCounts();

    if (!connected) {
      const interval = setInterval(fetchCounts, 30_000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, connected]);

  useEffect(() => {
    if (lastEvent) fetchCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastEvent]);

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
      <Link href="/" className="font-bold text-lg text-white">
        NetShield AI
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/overview" className="text-gray-300 hover:text-white">
          Overview
        </Link>
        {(user?.role === "soc_analyst" || user?.role === "admin") && (
          <Link href="/dashboard" className="text-gray-300 hover:text-white">
            Analyst Dashboard
          </Link>
        )}

        {(user?.role === "soc_analyst" || user?.role === "admin") && (
  <Link href="/live-monitor" className="text-gray-300 hover:text-white">
    Live Monitor
  </Link>
)}
{(user?.role === "soc_analyst" || user?.role === "admin") && (
  <Link href="/tasks" className="text-gray-300 hover:text-white">
    Tasks
  </Link>
)}

{(user?.role === "soc_analyst" || user?.role === "admin") && (
  <Link href="/incidents" className="text-gray-300 hover:text-white">
    Incidents
  </Link>
)}

        <Link href="/alerts" className="relative text-gray-300 hover:text-white">
          Alerts
          {openAlertCount !== null && openAlertCount > 0 && (
            <span className="absolute -top-2 -right-4 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {openAlertCount > 9 ? "9+" : openAlertCount}
            </span>
          )}
        </Link>
        <Link href="/reports" className="text-gray-300 hover:text-white">
  Reports
</Link>
        {user?.role === "admin" && (
          <Link href="/admin" className="text-gray-300 hover:text-white">
            Admin
          </Link>
        )}
        {user && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${connected ? "bg-teal-400" : "bg-gray-600"}`} />
            {connected ? "Live" : "Offline"}
          </span>
        )}
        {user ? (
          <>
            <span className="text-gray-400">
              {user.username} <span className="text-gray-600">({user.role})</span>
            </span>
            <Link href="/profile" className="text-gray-300 hover:text-white">
  Profile
</Link>
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="text-gray-300 hover:text-white">
              Login
            </Link>
            <Link href="/register" className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}