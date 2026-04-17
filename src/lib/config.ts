import { type RemixConfig, DEFAULT_CONFIG } from "../remix-config";

export type { RemixConfig };
export { DEFAULT_CONFIG };

export function resolveConfig(overrides?: Partial<RemixConfig>): RemixConfig {
  return { ...DEFAULT_CONFIG, ...(overrides || {}) };
}

export function deriveConstants(config: RemixConfig) {
  const LANE_COUNT = config.laneCount;
  const LANE_WIDTH = 2.5;
  const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
  const LANE_POSITIONS: number[] = [];
  for (let i = 0; i < LANE_COUNT; i++) {
    LANE_POSITIONS.push((i - Math.floor(LANE_COUNT / 2)) * LANE_WIDTH);
  }

  return {
    LANE_COUNT,
    LANE_WIDTH,
    ROAD_WIDTH,
    LANE_POSITIONS,
    INITIAL_SPEED: config.initialSpeed,
    MAX_SPEED: config.maxSpeed,
    SPEED_INCREMENT: config.speedIncrement,
    LANE_SWITCH_SPEED: 12,
    OBSTACLE_SPAWN_DISTANCE: 120,
    MIN_OBSTACLE_GAP: config.minObstacleGap,
    CAR_WIDTH: 1.8,
    CAR_HEIGHT: 0.8,
    CAR_LENGTH: 3.5,
    HITBOX_SHRINK: 0.3,
    NEAR_MISS_THRESHOLD: 0.8,
    ROAD_SEGMENT_LENGTH: 40,
    ROAD_SEGMENT_COUNT: 5,
  } as const;
}

export type GameConstants = ReturnType<typeof deriveConstants>;
