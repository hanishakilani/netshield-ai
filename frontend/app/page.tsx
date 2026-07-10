"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [status, setStatus] = useState<string>("checking...");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("backend unreachable"));
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-2">NetShield AI</h1>
      <p className="text-gray-400 mb-6">Network Anomaly Detection & Threat Monitoring System</p>
      <p className="text-sm px-4 py-2 rounded-full bg-gray-800 border border-gray-700">
        Backend status: <span className="font-medium">{status}</span>
      </p>
    </main>
  );
}