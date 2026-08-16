"use client";

import { useEffect, useState, useCallback } from "react";
import RequireAuth from "@/app/components/RequireAuth";
import RequireRole from "@/app/components/RequireRole";
import { useAuth } from "@/app/lib/auth-context";

type ManagedUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

function UserManagementContent() {
  const { user: currentUser, token } = useAuth();
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load users");
        return res.json();
      })
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function changeRole(userId: string, role: string) {
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ role }),
    });
    loadUsers();
  }

  async function toggleActive(userId: string, isActive: boolean) {
    if (!token) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: isActive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.detail || "Failed to update user");
      return;
    }
    loadUsers();
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-red-400">Error: {error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-3xl font-bold mb-1">User Management</h1>
      <p className="text-gray-400 mb-8">Manage roles and account status</p>

      {!users && <p className="text-gray-400">Loading users...</p>}

      {users && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400 text-left">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-800">
                  <td className="px-4 py-3">
                    {u.username}
                    {u.id === currentUser?.id && (
                      <span className="ml-2 text-xs text-gray-600">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="soc_analyst">SOC Analyst</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={u.is_active ? "text-teal-400" : "text-red-400"}>
                      {u.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, !u.is_active)}
                      disabled={u.id === currentUser?.id}
                      className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:bg-gray-700 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {u.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function UserManagementPage() {
  return (
    <RequireAuth>
      <RequireRole allowedRoles={["admin"]}>
        <UserManagementContent />
      </RequireRole>
    </RequireAuth>
  );
}