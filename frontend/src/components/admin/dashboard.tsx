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
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <header className="flex h-16 items-center justify-between border-b border-border px-6 bg-card/30 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">Portfolio Admin</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Owner</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.image ? (
              <Image src={user.image} alt={user.name || "Admin"} width={32} height={32} className="rounded-full border border-border" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                AD
              </div>
            )}
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-medium leading-none">{user.name || "System Admin"}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{user.email}</span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout} disabled={loading}>
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Admin Content Area */}
      <main className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
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
      </main>
    </div>
  );
}
