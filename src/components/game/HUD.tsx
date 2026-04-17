import React from "react";
import type { LeaderboardEntry } from "../../lib/api";

interface HUDProps {
  score: number;
  speed: number;
  leaderboard: LeaderboardEntry[];
  livesRemaining?: number;
  countdownRemaining?: number;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  pointerEvents: "none",
  zIndex: 20,
};

const topLeftStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: 24,
};

const scoreStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 56,
  fontWeight: 900,
  color: "#fff",
  textShadow: "0 0 20px rgba(249, 115, 22, 0.5)",
  lineHeight: 1,
};

const speedStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 16,
  color: "rgba(255, 255, 255, 0.5)",
  letterSpacing: 2,
  marginTop: 4,
};

const topRightStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  right: 24,
  background: "rgba(0, 0, 0, 0.4)",
  border: "1px solid rgba(249, 115, 22, 0.15)",
  borderRadius: 8,
  padding: "10px 14px",
  backdropFilter: "blur(8px)",
  minWidth: 180,
};

const lbTitleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "#f97316",
  marginBottom: 8,
  textAlign: "center",
};

const lbEntryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  fontSize: 14,
  padding: "2px 0",
  color: "#888",
};

const rankStyle: React.CSSProperties = {
  color: "#f97316",
  marginRight: 6,
  fontWeight: 600,
};

const lbEmptyStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#444",
  textAlign: "center",
};

const livesStyle: React.CSSProperties = {
  position: "absolute",
  top: 20,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "'Orbitron', monospace",
  fontSize: 18,
  color: "#ef4444",
  letterSpacing: 4,
  textShadow: "0 0 10px rgba(239, 68, 68, 0.5)",
};

const countdownStyle: React.CSSProperties = {
  position: "absolute",
  top: 80,
  left: "50%",
  transform: "translateX(-50%)",
  fontFamily: "'Orbitron', monospace",
  fontSize: 24,
  fontWeight: 700,
  color: "#fff",
  textShadow: "0 0 10px rgba(249, 115, 22, 0.5)",
};

export function HUD({
  score,
  speed,
  leaderboard,
  livesRemaining,
  countdownRemaining,
}: HUDProps) {
  const top5 = leaderboard.slice(0, 5);
  const kmh = Math.floor(speed * 3.6);

  return (
    <div style={containerStyle}>
      {/* Score + Speed */}
      <div style={topLeftStyle}>
        <div style={scoreStyle}>{Math.floor(score)}</div>
        <div style={speedStyle}>{kmh} km/h</div>
      </div>

      {/* Mini Leaderboard */}
      <div style={topRightStyle}>
        <div style={lbTitleStyle}>Leaderboard</div>
        {top5.length === 0 ? (
          <div style={lbEmptyStyle}>No scores yet</div>
        ) : (
          top5.map((entry, i) => (
            <div key={`${entry.name}-${i}`} style={lbEntryStyle}>
              <span>
                <span style={rankStyle}>#{i + 1}</span>
                {entry.name}
              </span>
              <span>{entry.score.toLocaleString()}</span>
            </div>
          ))
        )}
      </div>

      {/* Lives */}
      {livesRemaining != null && livesRemaining > 0 && (
        <div style={livesStyle}>
          {"♥".repeat(livesRemaining)}
        </div>
      )}

      {/* Countdown */}
      {countdownRemaining != null && countdownRemaining > 0 && (
        <div style={countdownStyle}>
          {Math.ceil(countdownRemaining)}s
        </div>
      )}
    </div>
  );
}
