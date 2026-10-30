"use client";

import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { BrandHeader } from "@/components/BrandHeader";

type Msg = { id: number; from: "driver" | "you"; text: string };

const seed: Msg[] = [
  {
    id: 1,
    from: "driver",
    text: "Hey! On my way with your materials. ETA about 30 min.",
  },
  {
    id: 2,
    from: "you",
    text: "Sounds good. Gate code is 4421. Call when you arrive.",
  },
  {
    id: 3,
    from: "driver",
    text: "Got it. I’ll text when I’m 5 min out.",
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
      <BrandHeader title="Chat with Alex" showBack backHref="/tracking" />
      <div style={{ padding: 16, minHeight: "calc(100% - 140px)" }}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`chat-bubble ${m.from === "you" ? "you" : "them"}`}
          >
            {m.text}
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={send} style={{ bottom: 0 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Message Alex..."
        />
        <button type="submit">Send</button>
      </form>
    </AppShell>
  );
}
