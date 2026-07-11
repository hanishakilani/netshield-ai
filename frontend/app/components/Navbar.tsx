"use client";

import Link from "next/link";
import { useAuth } from "@/app/lib/auth-context";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
      <Link href="/" className="font-bold text-lg text-white">
        NetShield AI
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/dashboard" className="text-gray-300 hover:text-white">
          Dashboard
        </Link>
        {user?.role === "admin" && (
          <Link href="/admin" className="text-gray-300 hover:text-white">
            Admin
          </Link>
        )}
        {user ? (
          <>
            <span className="text-gray-400">
              {user.username} <span className="text-gray-600">({user.role})</span>
            </span>
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