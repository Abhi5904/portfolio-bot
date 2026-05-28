"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin");
    }
  }, [status, router]);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl: "/admin" });
    } catch (err) {
      console.error("Login failed:", err);
      setLoading(false);
    }
  };

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-radial from-muted/30 to-background p-4">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/60 p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col items-center text-center gap-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            🛡️
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Admin Portal</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to manage conversations and visitor sessions.
            </p>
          </div>

          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-11 flex items-center justify-center gap-3 rounded-xl"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.555 0-6.445-2.89-6.445-6.445s2.89-6.445 6.445-6.445c1.614 0 3.09.588 4.237 1.567l3.122-3.122C19.23 1.83 15.93 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.333 0 10.53-4.464 10.53-10.714 0-.741-.067-1.428-.19-2.1H12.24z"/>
              </svg>
            )}
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
