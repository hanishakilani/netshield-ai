"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-lg p-8">
        <h1 className="text-2xl font-bold mb-1">Sign in</h1>
        <p className="text-gray-400 text-sm mb-6">Access the NetShield AI dashboard</p>

        {error && (
          <p className="mb-4 text-sm text-red-400 bg-red-950 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}

        <label className="block text-sm text-gray-300 mb-1">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full mb-4 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <label className="block text-sm text-gray-300 mb-1">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-6 px-3 py-2 rounded bg-gray-950 border border-gray-700 focus:outline-none focus:border-blue-500"
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        <p className="text-sm text-gray-400 mt-4 text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-400 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  );
}