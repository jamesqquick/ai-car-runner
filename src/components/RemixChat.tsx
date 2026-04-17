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
  description: string;
  state: "pending" | "active" | "done";
}

interface RemixResult {
  id: string;
  config?: { title?: string };
}

/* ── Example prompts ────────────────────────────────────── */

const EXAMPLE_PROMPTS = [
  { emoji: "\u{1F680}", label: "Dark space theme with fast gameplay, purple and blue neon colors", prompt: "dark space theme, fast, purple and blue neon" },
  { emoji: "\u{1F30A}", label: "Deep ocean theme, slow and calm with teal and aqua colors", prompt: "deep ocean theme, slow and calm, teal and aqua colors" },
  { emoji: "\u26A1", label: "Neon cyberpunk theme, very fast with pink and yellow", prompt: "neon cyberpunk, very fast, pink and yellow" },
  { emoji: "\u{1F3DC}\uFE0F", label: "Desert sandstorm theme with 3 lives and warm orange tones", prompt: "desert sandstorm theme, 3 lives, warm orange tones" },
  { emoji: "\u2744\uFE0F", label: "Frozen ice road with a 60 second countdown, icy blue", prompt: "frozen ice road, 60 second countdown, icy blue" },
  { emoji: "\u{1F525}", label: "Lava theme with very fast gameplay and moving obstacles", prompt: "volcanic lava world, very fast, red and black, moving obstacles" },
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
    @keyframes overlayFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes overlaySlideUp {
      from { opacity: 0; transform: translateY(30px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes stepSlideIn {
      from { opacity: 0; transform: translateX(-20px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes overlayPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.3); }
      50%      { box-shadow: 0 0 0 8px rgba(249,115,22,0); }
    }
    @keyframes overlayFadeOut {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    @keyframes spinnerDash {
      0%   { stroke-dashoffset: 60; transform: rotate(0deg); }
      50%  { stroke-dashoffset: 15; }
      100% { stroke-dashoffset: 60; transform: rotate(360deg); }
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
    fontSize: 18,
    fontWeight: 900,
    color: "#f97316",
    letterSpacing: 3,
  },
  backLink: {
    fontSize: 14,
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
    fontSize: 16,
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
    fontSize: 16,
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
    fontSize: 16,
    lineHeight: 1.6,
    color: "#ccc",
    maxWidth: 480,
  },
  bubbleUser: {
    background: "rgba(249,115,22,0.08)",
    border: "1px solid rgba(249,115,22,0.15)",
    borderRadius: 12,
    borderTopRightRadius: 4,
    padding: "12px 16px",
    fontSize: 16,
    lineHeight: 1.6,
    color: "#e5e7eb",
    maxWidth: 440,
  },

  /* Example buttons */
  examples: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
  },
  exampleBtn: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    lineHeight: 1.4,
    color: "#888",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "10px 18px",
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
    alignItems: "flex-end",
  },
  promptInput: {
    flex: 1,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 16,
    lineHeight: 1.5,
    padding: "12px 16px",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 20,
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    transition: "border-color 0.2s",
    resize: "none" as const,
    minHeight: 48,
    maxHeight: 120,
    overflowY: "auto" as const,
  },
  sendBtn: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 12,
    color: "#333",
    textAlign: "right" as const,
    marginTop: 4,
  },

  /* Overlay */
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2, 2, 15, 0.92)",
    backdropFilter: "blur(12px)",
    animation: "overlayFadeIn 0.3s ease-out",
    padding: 24,
  },
  overlayClosing: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2, 2, 15, 0.92)",
    backdropFilter: "blur(12px)",
    animation: "overlayFadeOut 0.4s ease-in forwards",
    padding: 24,
  },
  overlayCard: {
    width: "100%",
    maxWidth: 520,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: "40px 36px 32px",
    animation: "overlaySlideUp 0.4s ease-out",
  },
  overlayTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 16,
    fontWeight: 900,
    color: "#f97316",
    letterSpacing: 4,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 32,
  },
  overlayPrompt: {
    fontSize: 15,
    color: "#777",
    textAlign: "center" as const,
    marginBottom: 28,
    fontStyle: "italic" as const,
    lineHeight: 1.5,
  },
  stepRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    position: "relative" as const,
  },
  stepIndicatorCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: 36,
    flexShrink: 0,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.3s",
  },
  stepDotPending: {
    background: "rgba(255,255,255,0.04)",
    border: "2px solid rgba(255,255,255,0.1)",
  },
  stepDotActive: {
    background: "rgba(249,115,22,0.1)",
    border: "2px solid #f97316",
    animation: "overlayPulse 1.5s ease-in-out infinite",
  },
  stepDotDone: {
    background: "rgba(34,197,94,0.12)",
    border: "2px solid #22c55e",
  },
  stepLine: {
    width: 2,
    height: 32,
    background: "rgba(255,255,255,0.06)",
    transition: "background 0.4s",
  },
  stepLineDone: {
    width: 2,
    height: 32,
    background: "rgba(34,197,94,0.3)",
    transition: "background 0.4s",
  },
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepBadge: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 2,
    padding: "3px 10px",
    borderRadius: 4,
    display: "inline-block",
    marginBottom: 6,
    textTransform: "uppercase" as const,
    transition: "all 0.3s",
  },
  stepBadgePending: {
    background: "rgba(255,255,255,0.04)",
    color: "#444",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  stepBadgeActive: {
    background: "rgba(249,115,22,0.12)",
    color: "#f97316",
    border: "1px solid rgba(249,115,22,0.25)",
  },
  stepBadgeDone: {
    background: "rgba(34,197,94,0.1)",
    color: "#22c55e",
    border: "1px solid rgba(34,197,94,0.2)",
  },
  stepLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: "#ccc",
    marginBottom: 2,
    transition: "color 0.3s",
  },
  stepLabelDim: {
    fontSize: 16,
    fontWeight: 600,
    color: "#444",
    marginBottom: 2,
    transition: "color 0.3s",
  },
  stepDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: 1.5,
    transition: "color 0.3s",
  },
  stepDescDim: {
    fontSize: 14,
    color: "#333",
    lineHeight: 1.5,
    transition: "color 0.3s",
  },
  poweredBy: {
    marginTop: 28,
    textAlign: "center" as const,
    fontSize: 13,
    color: "#444",
    letterSpacing: 1,
  },
  poweredByLink: {
    color: "#f97316",
    textDecoration: "none",
    fontWeight: 600,
  },
  overlayResultWrap: {
    marginTop: 24,
    animation: "stepSlideIn 0.4s ease-out",
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
    fontSize: 16,
    color: "#f97316",
    letterSpacing: 2,
    marginBottom: 12,
  },
  playLink: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 16,
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
  qrCode: {
    display: "flex",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  shareUrl: {
    fontFamily: "monospace",
    fontSize: 13,
    color: "#555",
    marginTop: 10,
    wordBreak: "break-all" as const,
  },
  copyBtn: {
    fontSize: 12,
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
    marginTop: 16,
    fontSize: 15,
    lineHeight: 1.8,
    color: "#888",
  },
};

/* ── Sub-components ──────────────────────────────────────── */

/* ── Overlay spinner SVG ─────────────────────────────────── */

function Spinner({ size = 18, color = "#f97316" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      <circle
        cx="12" cy="12" r="9"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="60"
        style={{ animation: "spinnerDash 1.2s ease-in-out infinite", transformOrigin: "center" }}
      />
    </svg>
  );
}

/* ── Full-screen pipeline overlay ────────────────────────── */

function PipelineOverlay({
  steps,
  prompt,
  result,
  closing,
  onClose,
}: {
  steps: PipelineStep[];
  prompt: string;
  result: RemixResult | null;
  closing: boolean;
  onClose: () => void;
}) {
  const allDone = steps.every((s) => s.state === "done");

  return (
    <div style={closing ? S.overlayClosing : S.overlay}>
      <div style={S.overlayCard}>
        <div style={S.overlayTitle}>Building Your Remix</div>
        <div style={S.overlayPrompt}>"{prompt}"</div>

        {/* Stepper */}
        <div>
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            const dotStyle = {
              ...S.stepDot,
              ...(s.state === "done"
                ? S.stepDotDone
                : s.state === "active"
                  ? S.stepDotActive
                  : S.stepDotPending),
            };
            const badgeStyle = {
              ...S.stepBadge,
              ...(s.state === "done"
                ? S.stepBadgeDone
                : s.state === "active"
                  ? S.stepBadgeActive
                  : S.stepBadgePending),
            };
            const labelStyle =
              s.state === "pending" ? S.stepLabelDim : S.stepLabel;
            const descStyle =
              s.state === "pending" ? S.stepDescDim : S.stepDesc;

            const lineStyle =
              s.state === "done" ? S.stepLineDone : S.stepLine;

            return (
              <div
                key={s.key}
                style={{
                  ...S.stepRow,
                  animation: `stepSlideIn 0.35s ease-out ${i * 0.1}s both`,
                }}
              >
                {/* Left column: dot + connector line */}
                <div style={S.stepIndicatorCol}>
                  <div style={dotStyle}>
                    {s.state === "done" && (
                      <span style={{ color: "#22c55e", fontSize: 18, fontWeight: 700 }}>✓</span>
                    )}
                    {s.state === "active" && <Spinner />}
                    {s.state === "pending" && (
                      <span style={{ color: "#333", fontSize: 16 }}>○</span>
                    )}
                  </div>
                  {!isLast && <div style={lineStyle} />}
                </div>

                {/* Right column: badge, label, description */}
                <div style={S.stepContent}>
                  <div style={badgeStyle}>{s.product}</div>
                  <div style={labelStyle}>{s.label}</div>
                  <div style={descStyle}>{s.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Result card inside overlay when done */}
        {allDone && result && (
          <div style={S.overlayResultWrap}>
            <ResultCard result={result} />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button
                style={{
                  ...S.sendBtn,
                  fontSize: 13,
                  padding: "10px 24px",
                }}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fb923c";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f97316";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Back to Chat
              </button>
            </div>
          </div>
        )}

        {/* Powered by Cloudflare */}
        <div style={S.poweredBy}>
          Powered by{" "}
          <a
            href="https://developers.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            style={S.poweredByLink}
          >
            Cloudflare
          </a>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ result }: { result: RemixResult }) {
  const [copied, setCopied] = useState(false);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const title = result.config?.title || "Custom Remix";
  const remixUrl = `${window.location.origin}/remix/${result.id}`;

  useEffect(() => {
    fetch(`/api/qr?url=${encodeURIComponent(remixUrl)}`)
      .then((res) => (res.ok ? res.text() : null))
      .then((svg) => { if (svg) setQrSvg(svg); })
      .catch(() => {});
  }, [remixUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(remixUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={S.resultCard}>
      <div style={S.resultTitle}>{title}</div>
      <a
        href={`/remix/${result.id}`}
        target="_blank"
        rel="noopener noreferrer"
        style={S.playLink}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#fb923c";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.15)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#f97316";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        Play Remix
      </a>
      {qrSvg && (
        <div
          style={S.qrCode}
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      )}
      <div style={S.shareUrl}>{remixUrl}</div>
      <button style={S.copyBtn} onClick={handleCopy}>
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

/* ── Step definitions (shared) ────────────────────────────── */

function makeSteps(
  aiState: PipelineStep["state"],
  d1State: PipelineStep["state"],
  deployState: PipelineStep["state"],
): PipelineStep[] {
  return [
    {
      key: "ai",
      product: "Workers AI",
      label: "Generating game config",
      description: "Using Llama 3.1 on Workers AI to design your custom remix",
      state: aiState,
    },
    {
      key: "d1",
      product: "D1",
      label: "Saving remix",
      description: "Persisting your remix config to Cloudflare D1 edge database",
      state: d1State,
    },
    {
      key: "deploy",
      product: "Worker Loaders",
      label: "Spinning up dynamic worker",
      description: "Launching a sandboxed worker instance for your remix via Worker Loaders",
      state: deployState,
    },
  ];
}

export function RemixChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  // Overlay state
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayClosing, setOverlayClosing] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<PipelineStep[]>([]);
  const [overlayPrompt, setOverlayPrompt] = useState("");
  const [overlayResult, setOverlayResult] = useState<RemixResult | null>(null);

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

  function handlePickExample(prompt: string) {
    setInputValue(prompt);
  }

  function closeOverlay() {
    setOverlayClosing(true);
    setTimeout(() => {
      setShowOverlay(false);
      setOverlayClosing(false);
      setOverlayResult(null);
    }, 400);
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

    // User message in chat
    addMessage("user", prompt);
    setInputValue("");
    setSending(true);

    // Open the overlay
    setOverlayPrompt(prompt);
    setOverlaySteps(makeSteps("active", "pending", "pending"));
    setOverlayResult(null);
    setShowOverlay(true);

    try {
      // Run the API call in parallel with a minimum 5s timer for step 1
      const [res] = await Promise.all([
        fetch("/api/remix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, user_id: userId }),
        }),
        sleep(5000),
      ]);

      const body = await res.json();

      if (!res.ok) {
        throw new Error((body as { error?: string }).error || "Generation failed");
      }

      const data = body as RemixResult;

      // Step AI done, D1 active — hold for 5s
      setOverlaySteps(makeSteps("done", "active", "pending"));
      await sleep(5000);

      // Step D1 done, deploy active — hold for 5s
      setOverlaySteps(makeSteps("done", "done", "active"));
      await sleep(5000);

      // All done — brief pause before showing result
      setOverlaySteps(makeSteps("done", "done", "done"));
      await sleep(500);

      setOverlayResult(data);

      // Also add result card to chat for later reference
      addMessage("bot", <ResultCard result={data} />);

      setSending(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      // Close overlay on error and show message in chat
      setShowOverlay(false);
      addMessage("bot", `Something went wrong: ${message}. Try again!`);
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSend();
  }

  return (
    <div style={S.wrapper}>
      {/* Full-screen pipeline overlay */}
      {showOverlay && (
        <PipelineOverlay
          steps={overlaySteps}
          prompt={overlayPrompt}
          result={overlayResult}
          closing={overlayClosing}
          onClose={closeOverlay}
        />
      )}

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
          <textarea
            style={S.promptInput}
            placeholder="Describe your remix..."
            maxLength={100}
            autoComplete="off"
            rows={2}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              // Auto-resize to fit content
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
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
              if (!sending) {
                e.currentTarget.style.background = "#fb923c";
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(249, 115, 22, 0.6), 0 0 40px rgba(249, 115, 22, 0.15)";
              }
            }}
            onMouseLeave={(e) => {
              if (!sending) {
                e.currentTarget.style.background = "#f97316";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }
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
      <div style={{ marginBottom: 8 }}>Describe how you'd like to remix Car Runner. You can change:</div>
      <div style={S.infoText}>
        <div style={{ marginBottom: 8 }}>
          <span style={S.infoLabel}>Theme &amp; colors</span> — space, underwater, neon, desert...
        </div>
        <div style={{ marginBottom: 8 }}>
          <span style={S.infoLabel}>Speed &amp; difficulty</span> — faster, slower, more lanes, tighter gaps
        </div>
        <div>
          <span style={S.infoLabel}>Special rules</span> — 3 lives, countdown timer, moving obstacles
        </div>
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
