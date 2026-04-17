import React, { useRef, useEffect, useState, useCallback } from "react";
import type { RemixConfig } from "../lib/config";
import { resolveConfig } from "../lib/config";
import type { User, LeaderboardEntry } from "../lib/api";
import { GameCanvas, type GameCanvasHandle } from "./game/GameCanvas";

interface PlayPageProps {
  config?: Partial<RemixConfig>;
  /** Path to redirect to on game over. Defaults to "/" */
  lobbyPath?: string;
}

export function PlayPage({ config: configOverrides, lobbyPath = "/" }: PlayPageProps) {
  const resolvedConfig = resolveConfig(configOverrides);
  const [user, setUser] = useState<User | null>(null);
  const [commentaryEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("commentary") === "1";
  });

  const gameCanvasRef = useRef<GameCanvasHandle>(null);
  const [started, setStarted] = useState(false);

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

  // Auto-start the game once the canvas is mounted
  useEffect(() => {
    if (user && !started) {
      const timer = setTimeout(() => {
        gameCanvasRef.current?.startGame();
        setStarted(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, started]);

  const handleGameOver = useCallback(
    (score: number, rank: number | null) => {
      const params = new URLSearchParams();
      params.set("score", String(score));
      if (rank != null) params.set("rank", String(rank));
      window.location.href = `${lobbyPath}?${params.toString()}`;
    },
    [lobbyPath]
  );

  const handleLeaderboardUpdate = useCallback((_entries: LeaderboardEntry[]) => {
    // Leaderboard updates are shown on the lobby page, not during play
  }, []);

  if (!user) return null;

  return (
    <GameCanvas
      ref={gameCanvasRef}
      config={resolvedConfig}
      user={user}
      onGameOver={handleGameOver}
      onLeaderboardUpdate={handleLeaderboardUpdate}
      commentaryEnabled={commentaryEnabled}
    />
  );
}
