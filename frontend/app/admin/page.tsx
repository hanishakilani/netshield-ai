"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";
import { useState as useStateSlack } from "react";
import Link from "next/link";

function SlackSettings({ token }: { token: string | null }) {
  const [enabled, setEnabled] = useState(false);
  const [minSeverity, setMinSeverity] = useState("high");
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [webhookInput, setWebhookInput] = useState("");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings/slack`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled);
        setMinSeverity(data.min_severity);
        setWebhookConfigured(data.webhook_configured);
        setLoaded(true);
      })
      .catch(() => {});
  }, [token]);

  async function save() {
    if (!token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/settings/slack`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        webhook_url: webhookInput || null,
        enabled,
        min_severity: minSeverity,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setWebhookConfigured(data.webhook_configured);
      setWebhookInput("");
      setSaveMessage("Saved.");
      setTimeout(() => setSaveMessage(null), 2000);
    }
  }

  if (!loaded) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
      <h2 className="text-lg font-medium mb-1">Slack notifications</h2>
      <p className="text-gray-500 text-sm mb-4">
        {webhookConfigured ? "A webhook is currently configured." : "No webhook configured yet."}
      </p>

      <label className="block text-sm text-gray-300 mb-1">Slack webhook URL</label>
      <input
        type="text"
        placeholder={webhookConfigured ? "•••• already saved — enter a new one to replace it" : "https://hooks.slack.com/services/..."}
        value={webhookInput}
        onChange={(e) => setWebhookInput(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 text-sm"
      />

      <label className="flex items-center gap-2 mb-4 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable Slack notifications
      </label>

      <label className="block text-sm text-gray-300 mb-1">Minimum severity to notify</label>
      <select
        value={minSeverity}
        onChange={(e) => setMinSeverity(e.target.value)}
        className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 text-sm"
      >
        <option value="high">High and above</option>
        <option value="critical">Critical only</option>
      </select>

      <button
        onClick={save}
        className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium"
      >
        Save Slack settings
      </button>
      {saveMessage && <span className="ml-3 text-teal-400 text-sm">{saveMessage}</span>}
    </div>
  );
}

function AdminContent() {
  const { token } = useAuth();
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/admin-only`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 403) {
          setResult("Access denied — this page requires the admin role.");
          return;
        }
        if (!res.ok) {
          setResult("Something went wrong checking admin access.");
          return;
        }
        const data = await res.json();
        setResult(`Welcome, admin ${data.username}. You have full access.`);
      })
      .catch(() => setResult("Could not reach the backend."));
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Admin panel</h1>
      <Link href="/admin/users" className="text-blue-400 text-sm hover:underline mb-6 inline-block">
  Manage users →
</Link>
      <SlackSettings token={token} />
      <p className="text-gray-300">{result ?? "Checking permissions..."}</p>
    </main>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}