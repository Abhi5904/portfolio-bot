import { apiFetch } from "@/lib/api-client";

export interface SessionResponse {
  status: string;
  message: string;
  data: {
    sessionId: string;
    createdAt: string;
  };
}

export const sessionService = {
  async generateSession(): Promise<SessionResponse> {
    return apiFetch<SessionResponse>("/public/sessions", {
      method: "POST",
    });
  },
};
