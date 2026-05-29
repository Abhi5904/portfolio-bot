"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BookOpen, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function AdminNavbar({ user }: AdminNavbarProps) {
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    setLoading(true);
    await signOut({ callbackUrl: "/admin/login" });
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin",
    },
    {
      name: "Knowledge Base",
      href: "/admin/documents",
      icon: BookOpen,
      active: pathname.startsWith("/admin/documents"),
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      active: pathname.startsWith("/admin/settings"),
    },
  ];

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6 bg-card/30 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-muted-foreground bg-clip-text text-transparent">
            Portfolio Admin
          </span>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Owner
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  item.active
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name || "Admin"}
              width={32}
              height={32}
              className="rounded-full border border-border transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold border border-border">
              {user.name ? user.name.slice(0, 2).toUpperCase() : "AD"}
            </div>
          )}
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-semibold leading-none">
              {user.name || "System Owner"}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5 max-w-[150px] truncate">
              {user.email}
            </span>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loading}
          className="rounded-xl flex items-center gap-2 border-muted hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all duration-250"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}
