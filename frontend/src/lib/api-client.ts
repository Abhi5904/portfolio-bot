import { getCookie } from "./cookies";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

async function getAdminToken(): Promise<string> {
  const res = await fetch("/api/auth/token");
  if (!res.ok) throw new Error("Not authenticated");
  const data = await res.json() as { token: string };
  return data.token;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) {
        searchParams.append(key, String(val));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += `?${qs}`;
    }
  }

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const sessionId = getCookie("visitor_session_id");
  if (sessionId) {
    defaultHeaders["x-session-id"] = sessionId;
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Clear cookie dynamically if unauthorized
      const { deleteCookie } = await import("./cookies");
      deleteCookie("visitor_session_id");
    }
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function apiFetchStream(
  path: string,
  body: unknown,
  onChunk: (data: { conversationId?: string; chunk?: string; done?: boolean; error?: string }) => void
): Promise<void> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const sessionId = getCookie("visitor_session_id");
  if (sessionId) {
    headers["x-session-id"] = sessionId;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      const { deleteCookie } = await import("./cookies");
      deleteCookie("visitor_session_id");
    }
    throw new Error(`Streaming API Error: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("ReadableStream not supported or response body is empty");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Hold the last incomplete line
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith("data: ")) {
          try {
            const rawData = trimmed.slice(6);
            const parsed = JSON.parse(rawData);
            onChunk(parsed);
          } catch (e) {
            console.error("Failed to parse SSE line JSON:", e, trimmed);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function adminApiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined) searchParams.append(key, String(val));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const token = await getAdminToken();

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
