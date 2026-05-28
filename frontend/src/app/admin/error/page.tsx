"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function AdminErrorPage() {
  const [loadingAction, setLoadingAction] = useState<"retry" | "exit" | null>(null);

  const handleRetry = async () => {
    setLoadingAction("retry");
    await signOut({ callbackUrl: "/admin/login" });
  };

  const handleExit = async () => {
    setLoadingAction("exit");
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-radial from-destructive/10 to-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-destructive/20 bg-card/60 p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive text-xl">
            ⚠️
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-destructive">Access Denied</h1>
            <p className="text-sm text-muted-foreground">
              This account is not authorized to access the Admin Portal. Only the default system owner account is allowed.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleRetry}
              disabled={loadingAction !== null}
              className={cn(
                buttonVariants({ variant: "default" }),
                "w-full h-11 rounded-xl text-center flex items-center justify-center gap-2 cursor-pointer"
              )}
            >
              {loadingAction === "retry" && <Loader2 className="h-4 w-4 animate-spin" />}
              Try Another Account
            </button>
            <button
              onClick={handleExit}
              disabled={loadingAction !== null}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full h-11 rounded-xl text-center flex items-center justify-center gap-2 cursor-pointer"
              )}
            >
              {loadingAction === "exit" && <Loader2 className="h-4 w-4 animate-spin" />}
              Back to Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
