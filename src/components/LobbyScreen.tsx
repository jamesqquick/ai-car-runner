import React, { useState, useEffect } from "react";
import type { User } from "../lib/api";

interface LobbyScreenProps {
  /** If set, this is a remix lobby */
  remixId?: string;
  remixTitle?: string;
  /** Base path for play link. Defaults to "/play" */
  playPath?: string;
}

const overlayStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "80vh",
  gap: 12,
  padding: "40px 20px",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 48,
  fontWeight: 900,
  color: "#f97316",
  letterSpacing: 6,
  textTransform: "uppercase",
  textShadow: "0 0 40px rgba(249, 115, 22, 0.4)",
  marginBottom: 4,
  textAlign: "center",
};

const crashResultStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  marginBottom: 16,
};

const crashScoreLabelStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 3,
  color: "#888",
};

const crashScoreValueStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 56,
  fontWeight: 900,
  color: "#f97316",
  textShadow: "0 0 30px rgba(249, 115, 22, 0.5)",
};

const crashRankStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 18,
  color: "#fff",
  letterSpacing: 2,
};

const crashCongratsStyle: React.CSSProperties = {
  fontFamily: "'Orbitron', monospace",
  fontSize: 16,
  color: "#22c55e",
  letterSpacing: 2,
  marginTop: 4,
};

const optionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
  fontSize: 15,
  color: "#888",
};

const checkboxStyle: React.CSSProperties = {
  accentColor: "#f97316",
  width: 16,
  height: 16,
};



export function LobbyScreen({
  remixId,
  remixTitle,
  playPath = "/play",
}: LobbyScreenProps) {
  const [user, setUser] = useState<User | null>(null);
  const [commentaryEnabled, setCommentaryEnabled] = useState(false);

  const isRemix = !!remixId;

  // Read user from localStorage, redirect to /login if missing
  useEffect(() => {
    try {
      const stored = localStorage.getItem("car_runner_user");
      if (stored) {
        setUser(JSON.parse(stored) as User);
      } else {
        window.location.href = "/login";
      }
    } catch {
      window.location.href = "/login";
    }
  }, []);

  // Read crash results from URL params
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();
  const crashScore = params.get("score") ? parseInt(params.get("score")!, 10) : undefined;
  const crashRank = params.get("rank") ? parseInt(params.get("rank")!, 10) : null;
  const hasCrash = crashScore !== undefined;

  // Load commentary pref from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("car_runner_commentary");
      if (stored === "true") setCommentaryEnabled(true);
    } catch {
      // ignore
    }
  }, []);

  if (!user) {
    // Still loading from localStorage
    return null;
  }

  const displayTitle = isRemix && remixTitle ? remixTitle.toUpperCase() : "CAR RUNNER";

  let congratsText = "";
  if (hasCrash && !isRemix && crashRank != null) {
    if (crashRank === 1) congratsText = "NEW HIGH SCORE!";
    else if (crashRank <= 10) congratsText = "TOP 10 FINISH!";
  }

  const handleCommentaryToggle = (enabled: boolean) => {
    setCommentaryEnabled(enabled);
    localStorage.setItem("car_runner_commentary", String(enabled));
  };

  // Build play URL with commentary preference
  const playUrl = commentaryEnabled
    ? `${playPath}?commentary=1`
    : playPath;

  return (
    <div style={overlayStyle}>
      <h1 style={titleStyle}>{displayTitle}</h1>

      {hasCrash && (
        <div style={crashResultStyle}>
          <div style={crashScoreLabelStyle}>Distance</div>
          <div style={crashScoreValueStyle}>{crashScore}</div>
          {!isRemix && crashRank != null && (
            <div style={crashRankStyle}>Rank #{crashRank}</div>
          )}
          {congratsText && <div style={crashCongratsStyle}>{congratsText}</div>}
        </div>
      )}

      {!isRemix && (
        <label style={optionsStyle}>
          <input
            type="checkbox"
            style={checkboxStyle}
            checked={commentaryEnabled}
            onChange={(e) => handleCommentaryToggle(e.target.checked)}
          />
          AI Commentary
        </label>
      )}

      <a href={playUrl} className="btn-primary">
        {hasCrash ? "Race Again" : "Start Race"}
      </a>

      <a href="/leaderboard" className="btn-secondary">
        View High Scores
      </a>

      {!isRemix && (
        <>
          <a href="/remix" className="btn-secondary">
            Remix This Game
          </a>
          <a href="/gallery" className="btn-secondary">
            Browse Remixes
          </a>
        </>
      )}
    </div>
  );
}
