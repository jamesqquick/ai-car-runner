import React, { useCallback, useEffect, useRef, useState } from "react";

/* ───────── Types ───────── */

interface Racer {
  name: string;
  distance: number;
  speed: number;
  startTime: number;
}

interface LeaderboardEntry {
  name: string;
  score: number;
}

interface RecentFinish {
  name: string;
  score: number;
  rank: number;
  timestamp: number;
}

type WsMessage =
  | { type: "init"; racers: { userId: string; name: string; distance: number; speed: number }[] }
  | { type: "race_start"; racer: { userId: string; name: string } }
  | { type: "race_update"; userId: string; distance: number; speed: number }
  | { type: "race_end"; userId: string; name: string; score: number; rank: number }
  | { type: "race_end_disconnect"; userId: string }
  | { type: "leaderboard_update"; entries: LeaderboardEntry[] };

/* ───────── Styles ───────── */

const ORANGE = "#f97316";
const BG = "#050510";

const containerStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gridTemplateRows: "auto 1fr auto",
  height: "100vh",
  padding: "30px 40px",
  gap: 30,
  background: BG,
  color: "#fff",
  fontFamily: "'Inter', system-ui, sans-serif",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 36,
  fontWeight: 900,
  color: ORANGE,
  letterSpacing: 4,
  textShadow: "0 0 30px rgba(249, 115, 22, 0.4)",
};

const poweredByStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 14,
  color: "#555",
  letterSpacing: 3,
  textTransform: "uppercase",
};

const statusDotBase: React.CSSProperties = {
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  marginRight: 8,
  verticalAlign: "middle",
};

const panelStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.02)",
  border: "1px solid rgba(249, 115, 22, 0.1)",
  borderRadius: 16,
  padding: "28px 32px",
  overflow: "hidden",
};

const panelHeadingStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 16,
  fontWeight: 700,
  color: ORANGE,
  letterSpacing: 4,
  textTransform: "uppercase",
  marginBottom: 20,
};

const racingPanelStyle: React.CSSProperties = {
  ...panelStyle,
  display: "flex",
  flexDirection: "column",
  overflowY: "auto",
};

const racersContainerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  overflowY: "auto",
};

const racerCardStyle: React.CSSProperties = {
  background: "rgba(249, 115, 22, 0.05)",
  border: "1px solid rgba(249, 115, 22, 0.15)",
  borderRadius: 12,
  padding: "18px 22px",
  display: "flex",
  alignItems: "center",
  gap: 20,
};

const racerIndicatorStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#22c55e",
  boxShadow: "0 0 8px rgba(34, 197, 94, 0.6)",
  flexShrink: 0,
};

const racerNameStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 18,
  fontWeight: 700,
  color: "#fff",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const racerSpeedStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 13,
  color: "#666",
  marginTop: 2,
  letterSpacing: 1,
};

const racerDistanceStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 28,
  fontWeight: 900,
  color: ORANGE,
  textShadow: "0 0 20px rgba(249, 115, 22, 0.4)",
  flexShrink: 0,
  letterSpacing: 2,
};

const waitingStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 20,
  color: "#333",
  letterSpacing: 2,
  textAlign: "center",
  padding: "40px 0",
};

const racerCountStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 13,
  color: "#666",
  letterSpacing: 2,
  marginLeft: 12,
};

const lbRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderRadius: 8,
  marginBottom: 4,
};

const lbRankStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 22,
  fontWeight: 900,
  color: ORANGE,
  width: 50,
  textAlign: "center",
};

const lbNameStyle: React.CSSProperties = {
  flex: 1,
  fontSize: 20,
  fontWeight: 600,
  color: "#e5e7eb",
  paddingLeft: 12,
};

const lbScoreStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 24,
  fontWeight: 700,
  color: "#fff",
};

const lbEmptyStyle: React.CSSProperties = {
  color: "#333",
  fontSize: 18,
  textAlign: "center",
  padding: 40,
};

const footerStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const techStackStyle: React.CSSProperties = {
  display: "flex",
  gap: 24,
};

const techBadgeStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 12,
  color: "#444",
  letterSpacing: 2,
  textTransform: "uppercase",
  padding: "6px 12px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  borderRadius: 4,
};

const scoreFlashBaseStyle: React.CSSProperties = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  fontFamily: "'Orbitron', monospace",
  fontSize: 48,
  fontWeight: 900,
  color: ORANGE,
  textShadow: "0 0 60px rgba(249, 115, 22, 0.8)",
  opacity: 0,
  pointerEvents: "none",
  zIndex: 100,
  transition: "all 0.8s ease",
};

const scoreFlashActiveStyle: React.CSSProperties = {
  ...scoreFlashBaseStyle,
  opacity: 1,
  transform: "translate(-50%, -60%) scale(1.2)",
};

const recentFinishesPanel: React.CSSProperties = {
  ...panelStyle,
  gridColumn: "1 / -1",
  padding: "16px 32px",
};

const finishRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "8px 16px",
  borderRadius: 8,
  marginBottom: 4,
  background: "rgba(34, 197, 94, 0.05)",
  border: "1px solid rgba(34, 197, 94, 0.1)",
};

/* ───────── Helpers ───────── */

function rankColor(index: number): string {
  if (index === 0) return "#fbbf24";
  if (index === 1) return "#d1d5db";
  if (index === 2) return "#d97706";
  return ORANGE;
}

function formatElapsed(startTime: number): string {
  const seconds = Math.floor((Date.now() - startTime) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ───────── Component ───────── */

export function SpectatorDashboard() {
  const [connected, setConnected] = useState(false);
  const [racers, setRacers] = useState<Map<string, Racer>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentFinishes, setRecentFinishes] = useState<RecentFinish[]>([]);
  const [scoreFlash, setScoreFlash] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaderboardIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [, setTick] = useState(0);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch("/api/leaderboard?limit=10");
      if (res.ok) {
        const data = (await res.json()) as { entries: LeaderboardEntry[] };
        setLeaderboard(data.entries);
      }
    } catch {
      // silently ignore
    }
  }, []);

  const addRecentFinish = useCallback((finish: RecentFinish) => {
    setRecentFinishes((prev) => [finish, ...prev].slice(0, 5));
  }, []);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = JSON.parse(event.data as string) as WsMessage;

      switch (data.type) {
        case "init": {
          const next = new Map<string, Racer>();
          if (data.racers?.length) {
            for (const r of data.racers) {
              next.set(r.userId, {
                name: r.name,
                distance: r.distance,
                speed: r.speed,
                startTime: Date.now(),
              });
            }
          }
          setRacers(next);
          break;
        }

        case "race_start":
          setRacers((prev) => {
            const next = new Map(prev);
            next.set(data.racer.userId, {
              name: data.racer.name,
              distance: 0,
              speed: 0,
              startTime: Date.now(),
            });
            return next;
          });
          break;

        case "race_update":
          setRacers((prev) => {
            const existing = prev.get(data.userId);
            if (!existing) return prev;
            const next = new Map(prev);
            next.set(data.userId, {
              ...existing,
              distance: data.distance,
              speed: data.speed,
            });
            return next;
          });
          break;

        case "race_end":
          addRecentFinish({
            name: data.name,
            score: data.score,
            rank: data.rank,
            timestamp: Date.now(),
          });

          if (data.rank <= 10) {
            const msg =
              data.rank === 1
                ? `${data.name} — NEW HIGH SCORE!`
                : `${data.name} — #${data.rank} TOP 10!`;
            setScoreFlash(msg);
            setTimeout(() => setScoreFlash(null), 2500);
          }

          // Remove racer after brief delay
          setTimeout(() => {
            setRacers((prev) => {
              const next = new Map(prev);
              next.delete(data.userId);
              return next;
            });
          }, 3000);

          fetchLeaderboard();
          break;

        case "race_end_disconnect":
          setRacers((prev) => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
          break;

        case "leaderboard_update":
          setLeaderboard(data.entries);
          break;
      }
    },
    [addRecentFinish, fetchLeaderboard],
  );

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/ws/spectator?type=spectator`,
    );

    ws.addEventListener("open", () => {
      setConnected(true);
      fetchLeaderboard();
    });

    ws.addEventListener("message", handleMessage);

    ws.addEventListener("close", () => {
      wsRef.current = null;
      setConnected(false);
      reconnectRef.current = setTimeout(connect, 3000);
    });

    ws.addEventListener("error", () => {
      ws.close();
    });

    wsRef.current = ws;
  }, [fetchLeaderboard, handleMessage]);

  // Connect on mount, clean up on unmount
  useEffect(() => {
    connect();

    leaderboardIntervalRef.current = setInterval(fetchLeaderboard, 10_000);

    // Tick every second to update elapsed times
    elapsedIntervalRef.current = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (leaderboardIntervalRef.current) clearInterval(leaderboardIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect, fetchLeaderboard]);

  /* ───────── Render ───────── */

  const racerEntries = Array.from(racers.entries());

  return (
    <div style={containerStyle} className="spectate-grid">
      {/* Header */}
      <div style={headerStyle} className="spectate-header">
        <h1 style={titleStyle}>CAR RUNNER</h1>
        <div style={poweredByStyle} className="spectate-powered-by">
          <span
            style={{
              ...statusDotBase,
              background: connected ? "#22c55e" : "#ef4444",
            }}
          />
          Powered by Cloudflare
        </div>
      </div>

      {/* Leaderboard */}
      <div style={panelStyle} className="spectate-leaderboard">
        <h2 style={panelHeadingStyle}>Leaderboard</h2>
        {leaderboard.length === 0 ? (
          <div style={lbEmptyStyle}>No scores yet — be the first to race!</div>
        ) : (
          leaderboard.slice(0, 10).map((entry, i) => (
            <div
              key={`${entry.name}-${i}`}
              style={{
                ...lbRowStyle,
                background:
                  i % 2 === 0
                    ? "rgba(255, 255, 255, 0.02)"
                    : "transparent",
              }}
            >
              <div style={{ ...lbRankStyle, color: rankColor(i) }}>
                #{i + 1}
              </div>
              <div style={lbNameStyle}>{entry.name}</div>
              <div style={lbScoreStyle}>{entry.score.toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      {/* Active Racers */}
      <div style={racingPanelStyle} className="spectate-racers">
        <div style={{ display: "flex", alignItems: "baseline" }}>
          <h2 style={{ ...panelHeadingStyle, marginBottom: 20 }}>Now Racing</h2>
          {racerEntries.length > 0 && (
            <span style={racerCountStyle}>
              {racerEntries.length} active
            </span>
          )}
        </div>
        <div style={racersContainerStyle}>
          {racerEntries.length === 0 ? (
            <div style={waitingStyle}>No active racers</div>
          ) : (
            racerEntries.map(([userId, racer]) => (
              <div key={userId} style={racerCardStyle}>
                <div style={racerIndicatorStyle} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={racerNameStyle}>{racer.name}</div>
                  <div style={racerSpeedStyle}>
                    {Math.floor(racer.speed * 3.6)} km/h &middot;{" "}
                    {formatElapsed(racer.startTime)}
                  </div>
                </div>
                <div style={racerDistanceStyle}>
                  {Math.floor(racer.distance).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Finishes */}
      {recentFinishes.length > 0 && (
        <div style={recentFinishesPanel}>
          <h2 style={{ ...panelHeadingStyle, marginBottom: 12 }}>
            Recent Finishes
          </h2>
          {recentFinishes.map((finish, i) => (
            <div key={`${finish.name}-${finish.timestamp}`} style={finishRowStyle}>
              <div
                style={{
                  ...lbRankStyle,
                  fontSize: 18,
                  width: 40,
                  color: "#22c55e",
                }}
              >
                #{finish.rank}
              </div>
              <div style={{ ...lbNameStyle, fontSize: 18 }}>{finish.name}</div>
              <div style={{ ...lbScoreStyle, fontSize: 20 }}>
                {finish.score.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={footerStyle} className="spectate-footer">
        <div style={techStackStyle} className="spectate-tech-stack">
          <div style={techBadgeStyle}>
            <span style={{ color: ORANGE }}>Workers</span> Compute
          </div>
          <div style={techBadgeStyle}>
            <span style={{ color: ORANGE }}>D1</span> Database
          </div>
          <div style={techBadgeStyle}>
            <span style={{ color: ORANGE }}>Durable Objects</span> Real-time
          </div>
          <div style={techBadgeStyle}>
            <span style={{ color: ORANGE }}>WebSockets</span> Live Updates
          </div>
        </div>
      </div>

      {/* Score flash overlay */}
      <div style={scoreFlash ? scoreFlashActiveStyle : scoreFlashBaseStyle}>
        {scoreFlash}
      </div>
    </div>
  );
}
