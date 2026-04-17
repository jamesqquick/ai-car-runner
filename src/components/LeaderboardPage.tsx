import React, { useState, useEffect } from "react";
import type { User, LeaderboardEntry } from "../lib/api";
import { fetchLeaderboard } from "../lib/api";

const wrapperStyle: React.CSSProperties = {
  background: "#050510",
  color: "#fff",
  fontFamily: "'Inter', system-ui, sans-serif",
  minHeight: "100%",
};

const pageStyle: React.CSSProperties = {
  maxWidth: 600,
  margin: "0 auto",
  padding: "32px 24px 60px",
};

const pageTitleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 28,
  fontWeight: 900,
  color: "#f97316",
  textShadow: "0 0 40px rgba(249, 115, 22, 0.4)",
  letterSpacing: 4,
  textAlign: "center",
  marginBottom: 6,
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#555",
  textAlign: "center",
  marginBottom: 32,
};

const panelStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(249, 115, 22, 0.15)",
  borderRadius: 12,
  padding: "24px 28px",
  backdropFilter: "blur(10px)",
};

const entryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 16,
  padding: "10px 12px",
  borderRadius: 8,
  color: "#888",
};

const entryYouStyle: React.CSSProperties = {
  ...entryStyle,
  color: "#fff",
  fontWeight: 600,
  background: "rgba(249, 115, 22, 0.08)",
  border: "1px solid rgba(249, 115, 22, 0.15)",
};

const rankStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  color: "#f97316",
  fontWeight: 700,
  width: 48,
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const scoreStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontWeight: 600,
  flexShrink: 0,
  marginLeft: 16,
};

const emptyStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#444",
  textAlign: "center",
  padding: 40,
};

const loadingStyle: React.CSSProperties = {
  fontSize: 16,
  color: "#555",
  textAlign: "center",
  padding: 40,
};

export function LeaderboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("car_runner_user");
      if (stored) setUser(JSON.parse(stored) as User);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const poll = () => {
      fetchLeaderboard()
        .then((data) => {
          setEntries(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={wrapperStyle}>
      <div style={pageStyle}>
        <h1 style={pageTitleStyle}>High Scores</h1>
        <p style={pageSubtitleStyle}>Top racers on the leaderboard</p>

        <div style={panelStyle}>
          {loading ? (
            <div style={loadingStyle}>Loading scores...</div>
          ) : entries.length === 0 ? (
            <div style={emptyStyle}>No scores yet — be the first to race!</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map((entry, i) => {
                const isYou = user != null && entry.name === user.name;
                return (
                  <div
                    key={`${entry.name}-${i}`}
                    style={{
                      ...(isYou ? entryYouStyle : entryStyle),
                      background: isYou
                        ? "rgba(249, 115, 22, 0.08)"
                        : i % 2 === 0
                          ? "rgba(255, 255, 255, 0.02)"
                          : "transparent",
                    }}
                  >
                    <span style={rankStyle}>#{i + 1}</span>
                    <span style={nameStyle}>
                      {entry.name}
                      {isYou ? " (you)" : ""}
                    </span>
                    <span style={scoreStyle}>{entry.score.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
