"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface AdminDashboardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminDashboard({ user }: AdminDashboardProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/admin/login" });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          System overview and quick analytics diagnostics.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sessions</p>
          <h3 className="text-3xl font-bold mt-2">1,248</h3>
          <p className="text-xs text-green-500 mt-1">↑ 12% from last week</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Messages</p>
          <h3 className="text-3xl font-bold mt-2">4,812</h3>
          <p className="text-xs text-green-500 mt-1">↑ 8% from last week</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg. Response Time</p>
          <h3 className="text-3xl font-bold mt-2">1.8s</h3>
          <p className="text-xs text-muted-foreground mt-1">Ollama local instance</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">System Status</p>
          <h3 className="text-3xl font-bold mt-2 text-green-500">Healthy</h3>
          <p className="text-xs text-muted-foreground mt-1">All services online</p>
        </div>
      </div>

      {/* System Details / Database Status */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">System Details</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Framework</span>
            <span className="font-mono">Next.js 16 (App Router)</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Database Layer</span>
            <span className="font-mono">Prisma ORM & PostgreSQL</span>
          </div>
          <div className="flex justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Background Processing</span>
            <span className="font-mono">BullMQ & Redis Queue</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">LLM Node</span>
            <span className="font-mono">LangChain + OllamaProvider</span>
          </div>
        </div>
      </div>
    </div>
  );
}
