export interface RemixConfig {
  // Identity
  id: string;
  prompt: string;
  title: string; // short name like "Space Mode"

  // Theme colors (hex strings)
  carColor: string;
  roadColor: string;
  skyColor: string;
  fogColor: string;
  curbColor: string;
  buildingHue: number; // 0-1
  lightingColor: string;
  speedLineColor: string;

  // Obstacle theme
  obstacleColors: string[];

  // Speed
  initialSpeed: number;
  maxSpeed: number;
  speedIncrement: number;

  // Difficulty
  laneCount: number; // 3-5
  minObstacleGap: number;
  multiLaneChance: number; // base chance 0-1
  triLaneRampMax: number; // max chance of 3-lane block 0-1

  // Special mechanic (only one at a time)
  specialMechanic: "none" | "moving_obstacles" | "lives" | "countdown";
  lives?: number; // for "lives" mechanic
  countdownSeconds?: number; // for "countdown" mechanic
  obstacleMovementSpeed?: number; // for "moving_obstacles" mechanic
}

export const DEFAULT_CONFIG: RemixConfig = {
  id: "",
  prompt: "",
  title: "Car Runner",

  carColor: "#f97316",
  roadColor: "#222230",
  skyColor: "#0a0a1e",
  fogColor: "#0a0a1e",
  curbColor: "#f97316",
  buildingHue: 0.65,
  lightingColor: "#fff0dd",
  speedLineColor: "#aaccff",

  obstacleColors: ["#ef4444", "#3b82f6", "#8b5cf6", "#10b981", "#eab308"],

  initialSpeed: 18,
  maxSpeed: 55,
  speedIncrement: 0.8,

  laneCount: 5,
  minObstacleGap: 8,
  multiLaneChance: 0.35,
  triLaneRampMax: 0.2,

  specialMechanic: "none",
};
