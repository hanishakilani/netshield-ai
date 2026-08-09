"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";

export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !allowedRoles.includes(user.role)) {
      router.push("/overview");
    }
  }, [isLoading, user, allowedRoles, router]);

  if (isLoading || !user) return null;
  if (!allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}