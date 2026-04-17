import React from "react";

const ORANGE = "#f97316";
const ORANGE_LIGHT = "#fb923c";
const ORANGE_DIM = "rgba(249, 115, 22, 0.3)";
const ORANGE_GLOW = "rgba(249, 115, 22, 0.6)";
const BG_SURFACE = "rgba(255, 255, 255, 0.03)";
const BORDER = "rgba(255, 255, 255, 0.06)";
const BORDER_ORANGE = "rgba(249, 115, 22, 0.15)";
const TEXT_DIM = "#999";
const TEXT_MUTED = "#888";

interface TechCard {
  name: string;
  tagline: string;
  description: string;
  inGame: string;
  benefit: string;
  icon: React.ReactNode;
}

const technologies: TechCard[] = [
  {
    name: "Cloudflare Workers",
    tagline: "Serverless compute at the edge",
    description:
      "The entire application — server-side rendering, API routes, WebSocket upgrades — runs on Cloudflare Workers. There's no origin server. Every request is handled at the edge location closest to the player.",
    inGame:
      "Workers powers everything: the Astro SSR pages you're browsing right now, the API endpoints that save scores and create remixes, and the WebSocket upgrade path that enables live spectating.",
    benefit:
      "Sub-50ms response times globally. No cold starts that interrupt gameplay. The game feels instant whether you're playing from Tokyo or Toronto.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <path d="M22 8L26 16L22 24H10L6 16L10 8H22Z" stroke={ORANGE} strokeWidth="2" fill="none" />
        <circle cx="16" cy="16" r="4" fill={ORANGE} opacity="0.3" />
        <circle cx="16" cy="16" r="2" fill={ORANGE} />
      </svg>
    ),
  },
  {
    name: "Workers AI",
    tagline: "Inference at the edge with Llama 3.1",
    description:
      "Workers AI runs Meta's Llama 3.1 8B model directly on Cloudflare's GPU infrastructure. No external API calls, no round-trips to a centralized inference server — the model runs where the request lands.",
    inGame:
      "Two features are powered by Workers AI. First, real-time race commentary: as you race, game events like near-misses, speed milestones, and crashes are sent to the AI, which generates punchy commentator phrases that are spoken aloud via the browser's speech synthesis. Second, the remix system: type a theme like \"underwater neon city\" and the AI generates an entire game configuration — colors, speeds, difficulty, special mechanics — creating a unique variant of the game.",
    benefit:
      "Commentary responses come back in milliseconds because the model runs at the edge, not in a distant data center. Remix generation feels conversational — describe a theme and play it seconds later.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="6" y="10" width="20" height="12" rx="3" stroke={ORANGE} strokeWidth="2" fill="none" />
        <circle cx="12" cy="16" r="2" fill={ORANGE} />
        <circle cx="20" cy="16" r="2" fill={ORANGE} />
        <path d="M14 16H18" stroke={ORANGE} strokeWidth="1.5" />
        <path d="M16 4V10" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
        <path d="M12 6L16 4L20 6" stroke={ORANGE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    name: "D1",
    tagline: "SQLite at the edge",
    description:
      "D1 is Cloudflare's serverless SQL database built on SQLite. It stores structured data with zero configuration and replicates reads globally for low-latency queries.",
    inGame:
      "Three tables drive the game's persistence: users (accounts created at login), scores (every race result with timestamps and rankings), and remixes (AI-generated game configs tied to their creators). The leaderboard, gallery, and player history all query D1.",
    benefit:
      "Leaderboard queries return in single-digit milliseconds. Scores persist instantly after a crash. The remix gallery loads with full creator attribution because the relational model keeps everything connected.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <ellipse cx="16" cy="10" rx="10" ry="4" stroke={ORANGE} strokeWidth="2" fill="none" />
        <path d="M6 10V22C6 24.2 10.5 26 16 26C21.5 26 26 24.2 26 22V10" stroke={ORANGE} strokeWidth="2" fill="none" />
        <path d="M6 16C6 18.2 10.5 20 16 20C21.5 20 26 18.2 26 16" stroke={ORANGE} strokeWidth="1.5" strokeDasharray="3 2" opacity="0.5" />
      </svg>
    ),
  },
  {
    name: "Durable Objects",
    tagline: "Stateful coordination with WebSockets",
    description:
      "Durable Objects provide single-threaded, globally unique compute instances with persistent state. Combined with WebSocket Hibernation, they can manage thousands of concurrent connections efficiently — the DO only wakes up when a message arrives.",
    inGame:
      "A single SpectatorHub Durable Object manages all real-time connections. When you race, your game client sends telemetry (position, speed, events) over a WebSocket to the DO. The DO broadcasts this to every connected spectator dashboard in real-time. When you crash, spectators see your final score and rank instantly.",
    benefit:
      "True real-time multiplayer spectating with no polling, no external pub/sub service, and no message broker. WebSocket Hibernation means the DO consumes zero resources when idle, scaling to zero cost between races.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="10" stroke={ORANGE} strokeWidth="2" fill="none" />
        <circle cx="16" cy="16" r="3" fill={ORANGE} opacity="0.3" />
        <line x1="16" y1="6" x2="16" y2="13" stroke={ORANGE} strokeWidth="1.5" />
        <line x1="16" y1="19" x2="16" y2="26" stroke={ORANGE} strokeWidth="1.5" />
        <line x1="6" y1="16" x2="13" y2="16" stroke={ORANGE} strokeWidth="1.5" />
        <line x1="19" y1="16" x2="26" y2="16" stroke={ORANGE} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: "Dynamic Workers",
    tagline: "On-demand isolated Worker instances",
    description:
      "Dynamic Workers create on-demand, isolated Worker instances at runtime. Each dynamically-created Worker runs in its own execution context, providing full isolation between different workloads without deploying separate Workers.",
    inGame:
      "Every remix gets its own dynamically-created Worker. When you create or play a remix, the game fetches the remix config from D1, then spins up an isolated Worker instance that serves that specific theme's configuration. Each remix runs independently.",
    benefit:
      "Full isolation between remixes — one player's custom theme can never interfere with another's. No need to deploy a separate Worker per remix. The system scales to unlimited remixes with zero deployment overhead.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect x="4" y="6" width="10" height="8" rx="2" stroke={ORANGE} strokeWidth="1.5" fill="none" />
        <rect x="18" y="6" width="10" height="8" rx="2" stroke={ORANGE} strokeWidth="1.5" fill="none" />
        <rect x="4" y="18" width="10" height="8" rx="2" stroke={ORANGE} strokeWidth="1.5" fill="none" />
        <rect x="18" y="18" width="10" height="8" rx="2" stroke={ORANGE} strokeWidth="1.5" fill="none" />
        <circle cx="9" cy="10" r="1.5" fill={ORANGE} />
        <circle cx="23" cy="10" r="1.5" fill={ORANGE} />
        <circle cx="9" cy="22" r="1.5" fill={ORANGE} />
        <circle cx="23" cy="22" r="1.5" fill={ORANGE} />
      </svg>
    ),
  },
];

function ArchitectureDiagram() {
  return (
    <svg
      viewBox="0 0 800 420"
      style={{ width: "100%", maxWidth: 800, height: "auto" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={ORANGE} stopOpacity="0.2" />
          <stop offset="50%" stopColor={ORANGE} stopOpacity="0.8" />
          <stop offset="100%" stopColor={ORANGE} stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="800" height="420" fill="transparent" />

      {/* Player node */}
      <g transform="translate(80, 190)">
        <circle r="36" fill="rgba(249, 115, 22, 0.08)" stroke={ORANGE} strokeWidth="2" />
        <text textAnchor="middle" y="-4" fill={ORANGE} fontSize="11" fontFamily="'Orbitron', monospace" fontWeight="700">
          PLAYER
        </text>
        <text textAnchor="middle" y="12" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          Browser
        </text>
      </g>

      {/* Workers hub */}
      <g transform="translate(320, 190)">
        <rect x="-60" y="-44" width="120" height="88" rx="12" fill="rgba(249, 115, 22, 0.06)" stroke={ORANGE} strokeWidth="2" />
        <text textAnchor="middle" y="-12" fill={ORANGE} fontSize="11" fontFamily="'Orbitron', monospace" fontWeight="700">
          CLOUDFLARE
        </text>
        <text textAnchor="middle" y="6" fill={ORANGE} fontSize="11" fontFamily="'Orbitron', monospace" fontWeight="700">
          WORKERS
        </text>
        <text textAnchor="middle" y="24" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          SSR + API + WS
        </text>
      </g>

      {/* Connection: Player -> Workers */}
      <line x1="120" y1="190" x2="256" y2="190" stroke={ORANGE} strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
      <polygon points="256,185 266,190 256,195" fill={ORANGE} opacity="0.6" />

      {/* Workers AI node */}
      <g transform="translate(580, 60)">
        <rect x="-70" y="-36" width="140" height="72" rx="10" fill="rgba(249, 115, 22, 0.04)" stroke={BORDER_ORANGE} strokeWidth="1.5" />
        <text textAnchor="middle" y="-8" fill={ORANGE} fontSize="10" fontFamily="'Orbitron', monospace" fontWeight="700">
          WORKERS AI
        </text>
        <text textAnchor="middle" y="8" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          Llama 3.1 8B
        </text>
        <text textAnchor="middle" y="22" fill={TEXT_MUTED} fontSize="8" fontFamily="'Inter', sans-serif">
          Commentary + Remixes
        </text>
      </g>

      {/* D1 node */}
      <g transform="translate(580, 170)">
        <rect x="-70" y="-36" width="140" height="72" rx="10" fill="rgba(249, 115, 22, 0.04)" stroke={BORDER_ORANGE} strokeWidth="1.5" />
        <text textAnchor="middle" y="-8" fill={ORANGE} fontSize="10" fontFamily="'Orbitron', monospace" fontWeight="700">
          D1
        </text>
        <text textAnchor="middle" y="8" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          SQLite at the edge
        </text>
        <text textAnchor="middle" y="22" fill={TEXT_MUTED} fontSize="8" fontFamily="'Inter', sans-serif">
          Users, Scores, Remixes
        </text>
      </g>

      {/* Durable Objects node */}
      <g transform="translate(580, 280)">
        <rect x="-70" y="-36" width="140" height="72" rx="10" fill="rgba(249, 115, 22, 0.04)" stroke={BORDER_ORANGE} strokeWidth="1.5" />
        <text textAnchor="middle" y="-8" fill={ORANGE} fontSize="10" fontFamily="'Orbitron', monospace" fontWeight="700">
          DURABLE OBJECTS
        </text>
        <text textAnchor="middle" y="8" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          SpectatorHub
        </text>
        <text textAnchor="middle" y="22" fill={TEXT_MUTED} fontSize="8" fontFamily="'Inter', sans-serif">
          Real-time WebSockets
        </text>
      </g>

      {/* Dynamic Workers node */}
      <g transform="translate(580, 380)">
        <rect x="-70" y="-30" width="140" height="60" rx="10" fill="rgba(249, 115, 22, 0.04)" stroke={BORDER_ORANGE} strokeWidth="1.5" />
        <text textAnchor="middle" y="-4" fill={ORANGE} fontSize="10" fontFamily="'Orbitron', monospace" fontWeight="700">
          DYNAMIC WORKERS
        </text>
        <text textAnchor="middle" y="12" fill={TEXT_DIM} fontSize="9" fontFamily="'Inter', sans-serif">
          Isolated remix Workers
        </text>
      </g>

      {/* Connection lines: Workers -> services */}
      {/* Workers -> AI */}
      <path d="M380 170 Q 460 60, 506 60" stroke={ORANGE} strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 3" />
      <polygon points="506,55 516,60 506,65" fill={ORANGE} opacity="0.4" />

      {/* Workers -> D1 */}
      <line x1="380" y1="186" x2="506" y2="170" stroke={ORANGE} strokeWidth="1.5" opacity="0.4" strokeDasharray="4 3" />
      <polygon points="506,165 516,170 506,175" fill={ORANGE} opacity="0.4" />

      {/* Workers -> DO */}
      <path d="M380 210 Q 460 280, 506 280" stroke={ORANGE} strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 3" />
      <polygon points="506,275 516,280 506,285" fill={ORANGE} opacity="0.4" />

      {/* Workers -> Dynamic Workers */}
      <path d="M380 226 Q 440 380, 506 380" stroke={ORANGE} strokeWidth="1.5" fill="none" opacity="0.4" strokeDasharray="4 3" />
      <polygon points="506,375 516,380 506,385" fill={ORANGE} opacity="0.4" />

      {/* Edge label */}
      <text x="400" y="410" textAnchor="middle" fill={TEXT_MUTED} fontSize="9" fontFamily="'Inter', sans-serif" opacity="0.5">
        Everything runs on Cloudflare's global network — no origin server
      </text>
    </svg>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "40px 24px 80px",
  },
  hero: {
    textAlign: "center",
    marginBottom: 64,
  },
  heroTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 36,
    fontWeight: 900,
    color: ORANGE,
    letterSpacing: 4,
    textTransform: "uppercase" as const,
    marginBottom: 16,
    lineHeight: 1.2,
  },
  heroSubtitle: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 18,
    color: TEXT_DIM,
    lineHeight: 1.7,
    maxWidth: 640,
    margin: "0 auto",
  },
  heroBadge: {
    display: "inline-block",
    fontFamily: "'Orbitron', monospace",
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    background: "rgba(249, 115, 22, 0.08)",
    border: `1px solid ${BORDER_ORANGE}`,
    borderRadius: 20,
    padding: "6px 16px",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 40,
  },
  sectionLabel: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 11,
    fontWeight: 700,
    color: ORANGE,
    letterSpacing: 3,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    marginBottom: 8,
    opacity: 0.7,
  },
  cardsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 24,
    marginBottom: 80,
  },
  card: {
    background: BG_SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 32,
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 8,
  },
  cardIcon: {
    flexShrink: 0,
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(249, 115, 22, 0.06)",
    borderRadius: 12,
    border: `1px solid ${BORDER_ORANGE}`,
  },
  cardName: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 16,
    fontWeight: 700,
    color: ORANGE,
    letterSpacing: 1,
  },
  cardTagline: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  cardDesc: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 15,
    color: TEXT_DIM,
    lineHeight: 1.7,
    marginBottom: 20,
    marginTop: 16,
  },
  cardSubsection: {
    background: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    padding: "16px 20px",
    marginBottom: 12,
    border: `1px solid ${BORDER}`,
  },
  cardSubLabel: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 10,
    fontWeight: 700,
    color: ORANGE,
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginBottom: 8,
    opacity: 0.7,
  },
  cardSubText: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 14,
    color: TEXT_DIM,
    lineHeight: 1.6,
  },
  diagramSection: {
    marginBottom: 80,
  },
  diagramContainer: {
    background: BG_SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: "32px 24px",
    display: "flex",
    justifyContent: "center",
    overflow: "hidden",
  },
  ctaSection: {
    textAlign: "center" as const,
  },
  ctaTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 20,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: 2,
    marginBottom: 12,
  },
  ctaSubtext: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 15,
    color: TEXT_DIM,
    marginBottom: 32,
  },
  ctaLinks: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 12,
    justifyContent: "center",
  },
};

function TechCardComponent({ tech }: { tech: TechCard }) {
  return (
    <div
      style={S.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = BORDER_ORANGE;
        e.currentTarget.style.boxShadow = `0 0 30px rgba(249, 115, 22, 0.06)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = BORDER;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={S.cardHeader}>
        <div style={S.cardIcon}>{tech.icon}</div>
        <div>
          <div style={S.cardName}>{tech.name}</div>
          <div style={S.cardTagline}>{tech.tagline}</div>
        </div>
      </div>

      <p style={S.cardDesc}>{tech.description}</p>

      <div style={S.cardSubsection}>
        <div style={S.cardSubLabel}>In the Game</div>
        <div style={S.cardSubText}>{tech.inGame}</div>
      </div>

      <div style={{ ...S.cardSubsection, marginBottom: 0 }}>
        <div style={S.cardSubLabel}>Why It Matters</div>
        <div style={S.cardSubText}>{tech.benefit}</div>
      </div>
    </div>
  );
}

export function AboutPage() {
  return (
    <div style={S.container}>
      {/* Hero */}
      <section style={S.hero}>
        <div style={S.heroBadge}>Powered by Cloudflare</div>
        <h1 style={S.heroTitle}>Built on the Edge</h1>
        <p style={S.heroSubtitle}>
          Car Runner is a 3D racing game that runs entirely on Cloudflare's
          developer platform. No origin servers, no external services — just
          Workers, AI, a database, and real-time coordination, all executing at
          the edge location closest to you.
        </p>
      </section>

      {/* Architecture Diagram */}
      <section style={S.diagramSection}>
        <div style={S.sectionLabel}>Architecture</div>
        <h2 style={{ ...S.sectionTitle, marginBottom: 24 }}>How It All Connects</h2>
        <div style={S.diagramContainer}>
          <ArchitectureDiagram />
        </div>
      </section>

      {/* Technology Cards */}
      <section>
        <div style={S.sectionLabel}>The Stack</div>
        <h2 style={S.sectionTitle}>Five Cloudflare Products, One Game</h2>
        <div style={S.cardsGrid}>
          {technologies.map((tech) => (
            <TechCardComponent key={tech.name} tech={tech} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={S.ctaSection}>
        <h2 style={S.ctaTitle}>See It in Action</h2>
        <p style={S.ctaSubtext}>
          Every feature described above is live and running right now.
        </p>
        <div style={S.ctaLinks}>
          <a href="/play" className="btn-primary" style={{ width: "auto", padding: "14px 32px", fontSize: 16 }}>
            Start Racing
          </a>
          <a href="/remix" className="btn-secondary" style={{ width: "auto", padding: "14px 32px", fontSize: 16, marginTop: 0 }}>
            Create a Remix
          </a>
          <a href="/spectate" className="btn-secondary" style={{ width: "auto", padding: "14px 32px", fontSize: 16, marginTop: 0 }}>
            Watch Live
          </a>
        </div>
      </section>
    </div>
  );
}
