"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { getCookie, setCookie } from "@/lib/cookies";
import { sessionService } from "@/services/session-service";

interface SessionContextProps {
  sessionId: string | null;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextProps>({
  sessionId: null,
  isLoading: true,
  refreshSession: async () => {},
});

export const SessionProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initSession = async (forceNew = false) => {
    try {
      setIsLoading(true);
      let sid = forceNew ? null : getCookie("visitor_session_id");
      if (!sid) {
        const res = await sessionService.generateSession();
        sid = res.data.sessionId;
        // Expire cookie after 30 days
        setCookie("visitor_session_id", sid, 30);
      }
      setSessionId(sid);
    } catch (err) {
      console.error("Failed to initialize session:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  const refreshSession = async () => {
    await initSession(true);
  };

  return (
    <SessionContext.Provider value={{ sessionId, isLoading, refreshSession }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => useContext(SessionContext);
