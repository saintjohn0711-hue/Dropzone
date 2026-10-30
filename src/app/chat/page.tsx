"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

type Msg = { id: number; from: "driver" | "you"; text: string };

const seed: Msg[] = [
  {
    id: 1,
    from: "driver",
    text: "Hey — I'm Alex with your DropZone order. On my way to Home Depot now.",
  },
  {
    id: 2,
    from: "you",
    text: "Sounds good. Gate code is 4421. Call when you arrive.",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState(seed);
  const [draft, setDraft] = useState("");

  function send(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: Date.now(), from: "you", text }]);
    setDraft("");
  }

  return (
    <AppShell showNav={false}>
      <BrandHeader showBack backHref="/tracking" />
      <div className="flex min-h-[70dvh] flex-col">
        <div className="border-b border-dz-border px-4 py-2 text-sm text-dz-muted">
          Chat with Alex · stub
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-xl px-3 py-2.5 text-sm ${
                m.from === "you"
                  ? "ml-auto bg-dz-orange text-white"
                  : "bg-dz-card text-dz-text"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <form
          onSubmit={send}
          className="flex gap-2 border-t border-dz-border bg-dz-dark px-4 py-3"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message driver…"
            className="flex-1 rounded-xl border border-dz-border bg-dz-card px-3 py-3 text-sm outline-none focus:border-dz-orange"
          />
          <button
            type="submit"
            className="rounded-xl bg-dz-orange px-4 py-3 font-bold text-white"
          >
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
