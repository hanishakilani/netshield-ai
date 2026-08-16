"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import { useAuth } from "@/app/lib/auth-context";

type Me = { username: string; email: string; role: string; is_active: boolean; created_at: string };

function ProfileContent() {
  const { token } = useAuth();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setMe)
      .catch(() => {});
  }, [token]);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Profile</h1>
      {!me ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md space-y-3 text-sm">
          <p className="flex justify-between"><span className="text-gray-400">Username</span><span>{me.username}</span></p>
          <p className="flex justify-between"><span className="text-gray-400">Email</span><span>{me.email}</span></p>
          <p className="flex justify-between"><span className="text-gray-400">Role</span><span className="capitalize">{me.role}</span></p>
          <p className="flex justify-between"><span className="text-gray-400">Status</span><span>{me.is_active ? "Active" : "Deactivated"}</span></p>
          <p className="flex justify-between"><span className="text-gray-400">Member since</span><span>{new Date(me.created_at).toLocaleDateString()}</span></p>
        </div>
      )}
    </main>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}