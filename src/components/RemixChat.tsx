import React, { useState, useRef, useEffect } from "react";

/* ── Types ──────────────────────────────────────────────── */

interface ChatMessage {
  id: number;
  from: "bot" | "user";
  content: React.ReactNode;
}

interface PipelineStep {
  key: string;
  product: string;
  label: string;
  state: "pending" | "active" | "done";
}

interface RemixResult {
  id: string;
  config?: { title?: string };
}

/* ── Example prompts ────────────────────────────────────── */

const EXAMPLE_PROMPTS = [
  { emoji: "\u{1F680}", label: "Space", prompt: "space theme with asteroids, fast" },
  { emoji: "\u{1F30A}", label: "Underwater", prompt: "underwater with fish obstacles, slow and calm" },
  { emoji: "\u26A1", label: "Cyberpunk", prompt: "neon cyberpunk, very fast, moving obstacles" },
  { emoji: "\u{1F3DC}\uFE0F", label: "Desert", prompt: "desert sandstorm, 3 lives" },
  { emoji: "\u2744\uFE0F", label: "Ice Road", prompt: "ice road, slippery, 60 second countdown" },
  { emoji: "\u{1F525}", label: "Lava", prompt: "lava world, chaos mode, very fast" },
] as const;

/* ── Helpers ─────────────────────────────────────────────── */

function getUserId(): string | null {
  try {
    const stored = localStorage.getItem("car_runner_user");
    if (stored) return (JSON.parse(stored) as { id: string }).id;
  } catch {
    /* invalid data */
  }
  return null;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/* ── Inline keyframe injection (once) ────────────────────── */

let stylesInjected = false;
function injectKeyframes() {
  if (stylesInjected) return;
  stylesInjected = true;
  const sheet = document.createElement("style");
  sheet.textContent = `
    @keyframes remixMsgIn {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes remixSpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(sheet);
}

/* ── Styles ──────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#050510",
    color: "#fff",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  header: {
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
  },
  headerTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 16,
    fontWeight: 900,
    color: "#f97316",
    letterSpacing: 3,
  },
  backLink: {
    fontSize: 12,
    color: "#555",
    textDecoration: "none",
    transition: "color 0.2s",
  },

  /* Chat area */
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    maxWidth: 600,
    width: "100%",
    margin: "0 auto",
  },

  /* Message row */
  msg: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    animation: "remixMsgIn 0.3s ease-out",
  },
  msgUser: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    animation: "remixMsgIn 0.3s ease-out",
    flexDirection: "row-reverse",
  },
  avatarBot: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
    background: "rgba(249,115,22,0.15)",
    border: "1px solid rgba(249,115,22,0.2)",
  },
  avatarUser: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    flexShrink: 0,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  bubbleBot: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    borderTopLeftRadius: 4,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#ccc",
    maxWidth: 440,
  },
  bubbleUser: {
    background: "rgba(249,115,22,0.08)",
    border: "1px solid rgba(249,115,22,0.15)",
    borderRadius: 12,
    borderTopRightRadius: 4,
    padding: "12px 16px",
    fontSize: 14,
    lineHeight: 1.6,
    color: "#e5e7eb",
    maxWidth: 440,
  },

  /* Example buttons */
  examples: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  exampleBtn: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12,
    color: "#888",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: "6px 14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },

  /* Input bar */
  inputBar: {
    padding: "16px 24px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    maxWidth: 600,
    width: "100%",
    margin: "0 auto",
  },
  inputRow: {
    display: "flex",
    gap: 10,
  },
  promptInput: {
    flex: 1,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    padding: "12px 16px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24,
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s",
  },
  sendBtn: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 12,
    fontWeight: 700,
    padding: "12px 20px",
    border: "none",
    borderRadius: 24,
    background: "#f97316",
    color: "#000",
    cursor: "pointer",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    transition: "all 0.2s",
    whiteSpace: "nowrap" as const,
  },
  sendBtnDisabled: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 12,
    fontWeight: 700,
    padding: "12px 20px",
    border: "none",
    borderRadius: 24,
    background: "#f97316",
    color: "#000",
    cursor: "not-allowed",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    whiteSpace: "nowrap" as const,
    opacity: 0.4,
  },
  charCount: {
    fontSize: 10,
    color: "#333",
    textAlign: "right" as const,
    marginTop: 4,
  },

  /* Pipeline steps */
  pipelineMsg: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    marginTop: 4,
  },
  pStep: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#333",
    transition: "color 0.3s",
  },
  pStepActive: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#888",
    transition: "color 0.3s",
  },
  pStepDone: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#22c55e",
    transition: "color 0.3s",
  },
  pStepIcon: {
    width: 16,
    textAlign: "center" as const,
  },
  pStepProduct: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 9,
    color: "#f97316",
    letterSpacing: 1,
  },

  /* Result card */
  resultCard: {
    background: "rgba(34,197,94,0.05)",
    border: "1px solid rgba(34,197,94,0.15)",
    borderRadius: 10,
    padding: 16,
    marginTop: 8,
    textAlign: "center" as const,
  },
  resultTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 14,
    color: "#f97316",
    letterSpacing: 2,
    marginBottom: 12,
  },
  playLink: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 14,
    fontWeight: 700,
    padding: "12px 32px",
    border: "none",
    borderRadius: 6,
    background: "#f97316",
    color: "#000",
    cursor: "pointer",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    textDecoration: "none",
    display: "inline-block",
    transition: "all 0.2s",
  },
  shareUrl: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#555",
    marginTop: 10,
    wordBreak: "break-all" as const,
  },
  copyBtn: {
    fontSize: 10,
    color: "#888",
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    padding: "3px 10px",
    cursor: "pointer",
    marginTop: 6,
    transition: "all 0.2s",
  },

  /* Customization info block */
  infoLabel: {
    color: "#bbb",
    fontWeight: 600,
  },
  infoText: {
    marginTop: 8,
    fontSize: 13,
    color: "#888",
  },
};

/* ── Sub-components ──────────────────────────────────────── */

function PipelineSteps({ steps }: { steps: PipelineStep[] }) {
  return (
    <div>
      <div style={{ marginBottom: 4 }}>Building your remix...</div>
      <div style={S.pipelineMsg}>
        {steps.map((s) => {
          const style =
            s.state === "done" ? S.pStepDone : s.state === "active" ? S.pStepActive : S.pStep;
          const icon = s.state === "done" ? "\u2713" : s.state === "active" ? "\u25CF" : "\u25CB";
          return (
            <div key={s.key} style={style}>
              <span style={S.pStepIcon}>{icon}</span>
              <span>
                <span style={S.pStepProduct}>{s.product}</span> {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: RemixResult }) {
  const [copied, setCopied] = useState(false);
  const title = result.config?.title || "Custom Remix";
  const remixUrl = `${window.location.origin}/remix/${result.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(remixUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={S.resultCard}>
      <div style={S.resultTitle}>{title}</div>
      <a href={`/remix/${result.id}`} style={S.playLink}>
        Play Remix
      </a>
      <div style={S.shareUrl}>{remixUrl}</div>
      <button style={S.copyBtn} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

export function RemixChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Seed the initial bot message
  useEffect(() => {
    setMessages([
      {
        id: nextId.current++,
        from: "bot",
        content: <InitialBotMessage onPickExample={handlePickExample} />,
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  function addMessage(from: "bot" | "user", content: React.ReactNode) {
    const msg: ChatMessage = { id: nextId.current++, from, content };
    setMessages((prev) => [...prev, msg]);
    return msg.id;
  }

  function updateMessage(id: number, content: React.ReactNode) {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content } : m)));
  }

  function handlePickExample(prompt: string) {
    setInputValue(prompt);
  }

  async function handleSend() {
    const prompt = inputValue.trim();
    if (!prompt || sending) return;

    const userId = getUserId();
    if (!userId) {
      addMessage(
        "bot",
        <span>
          You need to play the main game first to create an account.{" "}
          <a href="/" style={{ color: "#f97316" }}>
            Go to Car Runner
          </a>
        </span>,
      );
      return;
    }

    // User message
    addMessage("user", prompt);
    setInputValue("");
    setSending(true);

    // Pipeline message
    const initialSteps: PipelineStep[] = [
      { key: "ai", product: "Workers AI", label: "Generating game config", state: "active" },
      { key: "d1", product: "D1", label: "Saving remix", state: "pending" },
      { key: "deploy", product: "Workers", label: "Deploying to edge", state: "pending" },
    ];
    const pipelineId = addMessage("bot", <PipelineSteps steps={initialSteps} />);

    try {
      const res = await fetch("/api/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, user_id: userId }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error((body as { error?: string }).error || "Generation failed");
      }

      const data = body as RemixResult;

      // Step AI done, D1 active
      const stepsAfterAI: PipelineStep[] = [
        { key: "ai", product: "Workers AI", label: "Generating game config", state: "done" },
        { key: "d1", product: "D1", label: "Saving remix", state: "active" },
        { key: "deploy", product: "Workers", label: "Deploying to edge", state: "pending" },
      ];
      updateMessage(pipelineId, <PipelineSteps steps={stepsAfterAI} />);
      await sleep(500);

      // Step D1 done
      const stepsAfterD1: PipelineStep[] = [
        { key: "ai", product: "Workers AI", label: "Generating game config", state: "done" },
        { key: "d1", product: "D1", label: "Saving remix", state: "done" },
        { key: "deploy", product: "Workers", label: "Deploying to edge", state: "active" },
      ];
      updateMessage(pipelineId, <PipelineSteps steps={stepsAfterD1} />);
      await sleep(600);

      // All done
      const stepsFinal: PipelineStep[] = [
        { key: "ai", product: "Workers AI", label: "Generating game config", state: "done" },
        { key: "d1", product: "D1", label: "Saving remix", state: "done" },
        { key: "deploy", product: "Workers", label: "Deploying to edge", state: "done" },
      ];
      updateMessage(pipelineId, <PipelineSteps steps={stepsFinal} />);
      await sleep(300);

      addMessage("bot", <ResultCard result={data} />);

      setSending(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      addMessage("bot", `Something went wrong: ${message}. Try again!`);
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div style={S.wrapper}>
      {/* Chat area */}
      <div style={S.chatArea} ref={chatRef}>
        {messages.map((m) => {
          const isUser = m.from === "user";
          return (
            <div key={m.id} style={isUser ? S.msgUser : S.msg}>
              <div style={isUser ? S.avatarUser : S.avatarBot}>
                {isUser ? "\u{1F464}" : "\u{1F3CE}\uFE0F"}
              </div>
              <div style={isUser ? S.bubbleUser : S.bubbleBot}>{m.content}</div>
            </div>
          );
        })}
      </div>

      {/* Input bar */}
      <div style={S.inputBar}>
        <div style={S.inputRow}>
          <input
            type="text"
            style={S.promptInput}
            placeholder="Describe your remix..."
            maxLength={100}
            autoComplete="off"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "rgba(249,115,22,0.4)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
          <button
            style={sending ? S.sendBtnDisabled : S.sendBtn}
            disabled={sending}
            onClick={handleSend}
            onMouseEnter={(e) => {
              if (!sending) e.currentTarget.style.background = "#fb923c";
            }}
            onMouseLeave={(e) => {
              if (!sending) e.currentTarget.style.background = "#f97316";
            }}
          >
            Send
          </button>
        </div>
        <div style={S.charCount}>{inputValue.length}/100</div>
      </div>
    </div>
  );
}

/* ── Initial bot message (extracted for clarity) ─────────── */

function InitialBotMessage({ onPickExample }: { onPickExample: (p: string) => void }) {
  return (
    <>
      <div>Describe how you'd like to remix Car Runner. You can change:</div>
      <div style={S.infoText}>
        <span style={S.infoLabel}>Theme</span> — space, underwater, neon, desert...
        <br />
        <span style={S.infoLabel}>Obstacles</span> — asteroids, fish, lasers...
        <br />
        <span style={S.infoLabel}>Speed</span> — faster, slower, ramping...
        <br />
        <span style={S.infoLabel}>Special rules</span> — 3 lives, countdown timer, moving obstacles
      </div>
      <div style={S.examples}>
        {EXAMPLE_PROMPTS.map((ex) => (
          <button
            key={ex.label}
            style={S.exampleBtn}
            onClick={() => onPickExample(ex.prompt)}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#f97316";
              e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)";
              e.currentTarget.style.background = "rgba(249,115,22,0.06)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#888";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            }}
          >
            {ex.emoji} {ex.label}
          </button>
        ))}
      </div>
    </>
  );
}
