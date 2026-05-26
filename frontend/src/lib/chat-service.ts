import type { ChatMessage } from "@/types/chat";

/**
 * Chat transport layer.
 *
 * This is the single seam between the UI and the backend. Today it returns a
 * mocked Markdown reply so the chat experience is fully demoable without a
 * server. When the API is ready, implement the `fetch` branch below — no
 * component or hook needs to change.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function sendChatMessage(
  history: ChatMessage[],
  prompt: string,
): Promise<string> {
  if (API_URL) {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [...history, { role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Chat request failed: ${res.status}`);
    }
    const data = (await res.json()) as { reply: string };
    return data.reply;
  }

  // --- Mock fallback (no backend configured) ---------------------------------
  await delay(650 + Math.random() * 600);
  return mockReply(prompt);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mockReply(prompt: string): string {
  return [
    `Thanks for asking — _"${prompt.trim()}"_ is a good one.`,
    "",
    "Here's a quick rundown while the real brain is being wired up:",
    "",
    "- I'm a **full-stack developer** who likes shipping polished products.",
    "- Most comfortable across the **TypeScript** ecosystem.",
    "- Happiest when design and engineering meet in the middle.",
    "",
    "### Current stack",
    "",
    "| Layer    | Tools                         |",
    "| -------- | ----------------------------- |",
    "| Frontend | Next.js, React, Tailwind CSS  |",
    "| Backend  | Node.js, Postgres, Redis      |",
    "| Infra    | Docker, Vercel, GitHub Actions |",
    "",
    "```ts",
    "function greet(name: string) {",
    "  return `Hi, I'm ${name}. Ask me anything.`;",
    "}",
    "```",
    "",
    "> This is placeholder output — connect `NEXT_PUBLIC_API_URL` to get real answers.",
  ].join("\n");
}
