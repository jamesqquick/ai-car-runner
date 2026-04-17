import React from "react";
import type { LeaderboardEntry } from "../lib/api";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserName?: string;
  maxEntries?: number;
}

const panelStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(249, 115, 22, 0.15)",
  borderRadius: 10,
  padding: "16px 24px",
  minWidth: 300,
  maxWidth: 360,
  marginBottom: 20,
  backdropFilter: "blur(10px)",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "#f97316",
  marginBottom: 12,
  textAlign: "center",
};

const entryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 15,
  padding: "3px 0",
  color: "#888",
};

const entryYouStyle: React.CSSProperties = {
  ...entryStyle,
  color: "#fff",
  fontWeight: 600,
};

const rankStyle: React.CSSProperties = {
  color: "#f97316",
  marginRight: 8,
  fontWeight: 600,
};

const emptyStyle: React.CSSProperties = {
  ...entryStyle,
  color: "#444",
};

export function Leaderboard({
  entries,
  currentUserName,
  maxEntries = 10,
}: LeaderboardProps) {
  const visible = entries.slice(0, maxEntries);

  return (
    <div style={panelStyle}>
      <h3 style={headingStyle}>Leaderboard</h3>
      {visible.length === 0 ? (
        <div style={emptyStyle}>No scores yet</div>
      ) : (
        visible.map((entry, i) => {
          const isYou = currentUserName != null && entry.name === currentUserName;
          return (
            <div key={`${entry.name}-${i}`} style={isYou ? entryYouStyle : entryStyle}>
              <span>
                <span style={rankStyle}>#{i + 1}</span>
                {entry.name}
                {isYou ? " (you)" : ""}
              </span>
              <span>{entry.score.toLocaleString()}</span>
            </div>
          );
        })
      )}
    </div>
  );
}
