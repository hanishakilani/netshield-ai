"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("soc_analyst");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-1">Create account</h1>
        <p className="text-gray-400 text-sm mb-6">Register a new NetShield AI account</p>

        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="mb-4 text-sm text-green-400 bg-green-950 border border-green-900 rounded px-3 py-2">
            Account created — redirecting to login...
          </p>
        )}

        <label className="block text-sm text-gray-300 mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          minLength={3}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-sm text-gray-300 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-sm text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-sm text-gray-300 mb-1">Role (demo only)</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mb-6 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="viewer">Viewer</option>
          <option value="soc_analyst">SOC Analyst</option>
          <option value="admin">Admin</option>
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium"
        >
          {isSubmitting ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}