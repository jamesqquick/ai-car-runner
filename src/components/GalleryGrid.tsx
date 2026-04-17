import React, { useState, useEffect } from "react";

/* ── Types ──────────────────────────────────────────────── */

interface RemixConfig {
  title?: string;
  skyColor?: string;
  roadColor?: string;
  carColor?: string;
  curbColor?: string;
  obstacleColors?: string[];
  specialMechanic?: string;
}

interface Remix {
  id: string;
  prompt?: string;
  config?: RemixConfig;
  creator_name?: string;
  created_at?: string;
}

/* ── Keyframe injection ──────────────────────────────────── */

let stylesInjected = false;
function injectKeyframes() {
  if (stylesInjected) return;
  stylesInjected = true;
  const sheet = document.createElement("style");
  sheet.textContent = `
    @keyframes gallerySpin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(sheet);
}

/* ── Styles ──────────────────────────────────────────────── */

const S: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "#050510",
    color: "#fff",
    fontFamily: "'Inter', system-ui, sans-serif",
    minHeight: "100%",
  },

  /* Header */
  header: {
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    maxWidth: 900,
    margin: "0 auto",
  },
  headerTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 18,
    fontWeight: 900,
    color: "#f97316",
    letterSpacing: 3,
  },
  headerLinks: {
    display: "flex",
    gap: 16,
  },
  headerLink: {
    fontSize: 14,
    color: "#555",
    textDecoration: "none",
    transition: "color 0.2s",
  },

  /* Page */
  page: {
    maxWidth: 900,
    margin: "0 auto",
    padding: "32px 24px 60px",
  },
  pageTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 28,
    fontWeight: 900,
    color: "#f97316",
    textShadow: "0 0 40px rgba(249,115,22,0.4)",
    letterSpacing: 4,
    textAlign: "center" as const,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center" as const,
    marginBottom: 32,
  },

  /* Loading */
  loading: {
    textAlign: "center" as const,
    color: "#555",
    fontSize: 16,
    padding: "40px 0",
  },
  loadingSpinner: {
    display: "inline-block",
    width: 24,
    height: 24,
    border: "2px solid rgba(249,115,22,0.2)",
    borderTopColor: "#f97316",
    borderRadius: "50%",
    animation: "gallerySpin 0.8s linear infinite",
    marginBottom: 12,
  },

  /* Empty state */
  empty: {
    textAlign: "center" as const,
    color: "#555",
    fontSize: 16,
    padding: "60px 0",
  },
  emptyCta: {
    display: "inline-block",
    marginTop: 16,
    fontFamily: "'Orbitron', monospace",
    fontSize: 14,
    fontWeight: 700,
    padding: "10px 24px",
    border: "1px solid rgba(249,115,22,0.3)",
    borderRadius: 6,
    background: "rgba(249,115,22,0.1)",
    color: "#f97316",
    textDecoration: "none",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    transition: "all 0.2s",
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },

  /* Card */
  card: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 12,
    padding: 20,
    transition: "border-color 0.2s, transform 0.2s",
    display: "flex",
    flexDirection: "column" as const,
  },
  cardTitle: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 16,
    fontWeight: 700,
    color: "#f97316",
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardPrompt: {
    fontSize: 15,
    color: "#888",
    lineHeight: 1.5,
    marginBottom: 12,
    flex: 1,
  },
  cardColors: {
    display: "flex",
    gap: 4,
    marginBottom: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.1)",
  },
  cardMeta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
    color: "#444",
    marginBottom: 14,
  },
  cardCreator: {
    color: "#666",
  },
  cardMechanic: {
    fontFamily: "'Orbitron', monospace",
    fontSize: 11,
    letterSpacing: 1,
    color: "#555",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 4,
    padding: "3px 8px",
    textTransform: "uppercase" as const,
  },
  cardActions: {
    display: "flex",
    gap: 8,
  },
  cardBtnPlay: {
    flex: 1,
    fontFamily: "'Orbitron', monospace",
    fontSize: 13,
    fontWeight: 700,
    padding: "10px 0",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
    transition: "all 0.2s",
    background: "#f97316",
    color: "#000",
  },
};

/* ── Card component ──────────────────────────────────────── */

function RemixCard({ remix }: { remix: Remix }) {
  const config = remix.config || {};
  const title = config.title || "Untitled Remix";
  const prompt = remix.prompt || "";
  const creator = remix.creator_name || "Anonymous";
  const mechanic =
    config.specialMechanic && config.specialMechanic !== "none"
      ? config.specialMechanic.replace(/_/g, " ")
      : null;
  const date = remix.created_at
    ? new Date(remix.created_at + "Z").toLocaleDateString()
    : "";

  const colors = [
    config.skyColor,
    config.roadColor,
    config.carColor,
    config.curbColor,
    ...(config.obstacleColors || []),
  ]
    .filter(Boolean)
    .slice(0, 6);

  return (
    <div
      style={S.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(249,115,22,0.25)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={S.cardTitle}>{title}</div>
      <div style={S.cardPrompt}>"{prompt}"</div>

      {colors.length > 0 && (
        <div style={S.cardColors}>
          {colors.map((c, i) => (
            <div key={i} style={{ ...S.colorDot, background: c }} />
          ))}
        </div>
      )}

      <div style={S.cardMeta}>
        <span style={S.cardCreator}>
          by {creator} &middot; {date}
        </span>
        {mechanic && <span style={S.cardMechanic}>{mechanic}</span>}
      </div>

      <div style={S.cardActions}>
        <a
          href={`/remix/${remix.id}`}
          style={S.cardBtnPlay}
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
          Play
        </a>
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */

export function GalleryGrid() {
  const [remixes, setRemixes] = useState<Remix[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    injectKeyframes();

    async function load() {
      try {
        const res = await fetch("/api/remixes");
        if (!res.ok) throw new Error("Failed to load");

        const data = (await res.json()) as { remixes?: Remix[] };
        setRemixes(data.remixes || []);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div style={S.wrapper}>
      {/* Page content */}
      <div style={S.page}>
        <h1 style={S.pageTitle}>Community Remixes</h1>
        <p style={S.pageSubtitle}>Browse and play games remixed by the community</p>

        {/* Loading */}
        {loading && (
          <div style={S.loading}>
            <div style={S.loadingSpinner} />
            <div>Loading remixes...</div>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div style={S.empty}>
            <div>Failed to load remixes. Try refreshing.</div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && remixes.length === 0 && (
          <div style={S.empty}>
            <div>No remixes yet. Be the first!</div>
            <a
              href="/remix/"
              style={S.emptyCta}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(249,115,22,0.2)";
                e.currentTarget.style.borderColor = "rgba(249,115,22,0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(249,115,22,0.1)";
                e.currentTarget.style.borderColor = "rgba(249,115,22,0.3)";
              }}
            >
              Create a Remix
            </a>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && remixes.length > 0 && (
          <div style={S.grid}>
            {remixes.map((r) => (
              <RemixCard key={r.id} remix={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
