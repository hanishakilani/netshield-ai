"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";

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