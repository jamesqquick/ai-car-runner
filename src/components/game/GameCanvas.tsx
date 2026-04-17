import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import * as THREE from "three";
import type { RemixConfig } from "../../lib/config";
import { deriveConstants } from "../../lib/config";
import type { User, LeaderboardEntry } from "../../lib/api";
import { submitScore, fetchLeaderboard } from "../../lib/api";
import { SceneManager } from "../../lib/scene/SceneManager";
import { SpeedLines } from "../../lib/effects/speedLines";
import { CrashEffect } from "../../lib/effects/crashEffect";
import { checkCollision, checkNearMiss } from "../../lib/engine/physics";
import { createCar } from "../../lib/models/car";
import { createRoadSegment } from "../../lib/models/road";
import {
  createObstacleColors,
  createObstacle,
  spawnObstacles,
  despawnObstacles,
} from "../../lib/models/obstacles";
import { createBuilding, spawnScenery } from "../../lib/models/scenery";
import { SpectatorService } from "../../lib/services/spectator";
import { CommentaryService } from "../../lib/services/commentary";
import { HUD } from "./HUD";
import { CommentaryOverlay } from "./CommentaryOverlay";
import { TouchControls } from "./TouchControls";

interface GameCanvasProps {
  config: RemixConfig;
  user: User;
  onGameOver: (score: number, rank: number | null) => void;
  onLeaderboardUpdate: (entries: LeaderboardEntry[]) => void;
  commentaryEnabled: boolean;
}

export interface GameCanvasHandle {
  startGame: () => void;
}

const canvasStyle: React.CSSProperties = {
  width: "100vw",
  height: "100vh",
  display: "block",
};

const flashOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "#f97316",
  pointerEvents: "none",
  zIndex: 15,
  transition: "opacity 0.05s",
};

export const GameCanvas = forwardRef<GameCanvasHandle, GameCanvasProps>(
  function GameCanvas(
    { config, user, onGameOver, onLeaderboardUpdate, commentaryEnabled },
    ref
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);

    const [hudScore, setHudScore] = useState(0);
    const [hudSpeed, setHudSpeed] = useState(0);
    const [hudLeaderboard, setHudLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [hudLives, setHudLives] = useState<number | undefined>(undefined);
    const [hudCountdown, setHudCountdown] = useState<number | undefined>(undefined);
    const [commentaryText, setCommentaryText] = useState<string | null>(null);
    const [flashAlpha, setFlashAlpha] = useState(0);
    const [playing, setPlaying] = useState(false);

    // Stable callback refs to avoid re-creating the engine
    const onGameOverRef = useRef(onGameOver);
    onGameOverRef.current = onGameOver;
    const onLeaderboardUpdateRef = useRef(onLeaderboardUpdate);
    onLeaderboardUpdateRef.current = onLeaderboardUpdate;

    useImperativeHandle(ref, () => ({
      startGame: () => engineRef.current?.start(),
    }));

    // Touch control handlers
    const handleTouchLeft = useCallback(() => {
      engineRef.current?.moveLeft();
    }, []);
    const handleTouchRight = useCallback(() => {
      engineRef.current?.moveRight();
    }, []);

    // Sync commentary setting
    useEffect(() => {
      if (engineRef.current) {
        engineRef.current.commentary.setEnabled(commentaryEnabled);
      }
    }, [commentaryEnabled]);

    // Create engine on mount
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = createEngine(canvas, config, user, {
        setHudScore,
        setHudSpeed,
        setHudLeaderboard,
        setHudLives,
        setHudCountdown,
        setCommentaryText,
        setFlashAlpha,
        setPlaying,
        onGameOver: (score, rank) => onGameOverRef.current(score, rank),
        onLeaderboardUpdate: (entries) => onLeaderboardUpdateRef.current(entries),
      });

      engine.commentary.setEnabled(commentaryEnabled);
      engineRef.current = engine;

      // Fetch initial leaderboard
      fetchLeaderboard(config.id || undefined).then((entries) => {
        setHudLeaderboard(entries);
        onLeaderboardUpdateRef.current(entries);
      });

      return () => {
        engine.dispose();
        engineRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // mount-only

    return (
      <>
        <canvas ref={canvasRef} style={canvasStyle} />
        {flashAlpha > 0 && (
          <div style={{ ...flashOverlayStyle, opacity: flashAlpha }} />
        )}
        {playing && (
          <>
            <HUD
              score={hudScore}
              speed={hudSpeed}
              leaderboard={hudLeaderboard}
              livesRemaining={hudLives}
              countdownRemaining={hudCountdown}
            />
            <CommentaryOverlay text={commentaryText} />
            <TouchControls onLeft={handleTouchLeft} onRight={handleTouchRight} />
          </>
        )}
      </>
    );
  }
);

// ─── Engine factory (imperative Three.js lifecycle) ──────────

interface EngineCallbacks {
  setHudScore: (v: number) => void;
  setHudSpeed: (v: number) => void;
  setHudLeaderboard: (v: LeaderboardEntry[]) => void;
  setHudLives: (v: number | undefined) => void;
  setHudCountdown: (v: number | undefined) => void;
  setCommentaryText: (v: string | null) => void;
  setFlashAlpha: (v: number) => void;
  setPlaying: (v: boolean) => void;
  onGameOver: (score: number, rank: number | null) => void;
  onLeaderboardUpdate: (entries: LeaderboardEntry[]) => void;
}

function createEngine(
  canvas: HTMLCanvasElement,
  config: RemixConfig,
  user: User,
  cb: EngineCallbacks
) {
  const constants = deriveConstants(config);
  const {
    LANE_COUNT,
    LANE_POSITIONS,
    LANE_SWITCH_SPEED,
    INITIAL_SPEED,
    MAX_SPEED,
    SPEED_INCREMENT,
    OBSTACLE_SPAWN_DISTANCE,
    MIN_OBSTACLE_GAP,
    CAR_WIDTH,
    CAR_HEIGHT,
    CAR_LENGTH,
    HITBOX_SHRINK,
    NEAR_MISS_THRESHOLD,
    ROAD_SEGMENT_LENGTH,
    ROAD_SEGMENT_COUNT,
    ROAD_WIDTH,
  } = constants;

  const isRemix = !!config.id;

  // Scene manager
  const sm = new SceneManager(canvas, config);

  // Effects
  const speedLines = new SpeedLines(config, sm.scene);
  const crashEffect = new CrashEffect(sm.scene);

  // Car
  const car = createCar(config, CAR_WIDTH, CAR_HEIGHT, CAR_LENGTH);
  sm.scene.add(car);

  // Road segments
  const roadSegments: THREE.Group[] = [];
  for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
    const seg = createRoadSegment(config, constants, -i * ROAD_SEGMENT_LENGTH);
    roadSegments.push(seg);
    sm.scene.add(seg);
  }

  // Obstacle colors
  const obstacleColors = createObstacleColors(config);

  // Services
  const spectator = new SpectatorService();
  if (!isRemix) {
    spectator.connect();
  }

  const commentary = new CommentaryService();
  CommentaryService.preloadVoices();

  // ─── Mutable game state ───
  let gameState: "idle" | "playing" | "gameover" = "idle";
  let score = 0;
  let speed = INITIAL_SPEED;
  let currentLane = Math.floor(LANE_COUNT / 2);
  let targetX = LANE_POSITIONS[currentLane];
  let distanceTraveled = 0;
  let lastObstacleZ = -30;
  let obstacles: THREE.Object3D[] = [];
  let sceneryItems: THREE.Object3D[] = [];
  let lastSceneryZ = 0;
  let inputCooldown = false;
  let gameTime = 0;
  let shakeIntensity = 0;
  const shakeDecay = 0.92;
  let livesRemaining = config.specialMechanic === "lives" ? (config.lives || 3) : 0;
  let invincibleTimer = 0; // seconds of invincibility remaining after losing a life
  const INVINCIBLE_DURATION = 1.5;
  let countdownRemaining = config.specialMechanic === "countdown" ? (config.countdownSeconds || 60) : 0;
  let crashFlashAlpha = 0;
  let lastNearMissZ = 0;
  let animFrameId: number | null = null;
  let disposed = false;

  // Keyboard state
  const keys: Record<string, boolean> = {};

  // Gamepad state
  const GAMEPAD_DEADZONE = 0.3;
  let gamepadLaneCooldown = false;

  // Tilt state
  const TILT_THRESHOLD = 12;
  let tiltLaneCooldown = false;
  let deviceGamma = 0;

  // ─── Input handlers ───
  function onKeyDown(e: KeyboardEvent) {
    keys[e.code] = true;
  }
  function onKeyUp(e: KeyboardEvent) {
    keys[e.code] = false;
  }
  function onDeviceOrientation(e: DeviceOrientationEvent) {
    if (e.gamma !== null) {
      deviceGamma = e.gamma;
    }
  }
  function onResize() {
    sm.resize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onResize);
  window.addEventListener("deviceorientation", onDeviceOrientation);

  // iOS tilt permission
  function initTiltControls() {
    if (
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((state: string) => {
          if (state === "granted") {
            window.addEventListener("deviceorientation", onDeviceOrientation);
          }
        })
        .catch(() => {});
    }
  }
  const tiltClickHandler = () => {
    initTiltControls();
  };
  document.addEventListener("click", tiltClickHandler, { once: true });
  initTiltControls();

  // ─── Movement API (for touch controls) ───
  function moveLeft() {
    if (gameState !== "playing" || inputCooldown) return;
    if (currentLane > 0) {
      currentLane--;
      targetX = LANE_POSITIONS[currentLane];
      inputCooldown = true;
      setTimeout(() => (inputCooldown = false), 180);
    }
  }
  function moveRight() {
    if (gameState !== "playing" || inputCooldown) return;
    if (currentLane < LANE_COUNT - 1) {
      currentLane++;
      targetX = LANE_POSITIONS[currentLane];
      inputCooldown = true;
      setTimeout(() => (inputCooldown = false), 180);
    }
  }

  function handleInput() {
    if (gameState !== "playing" || inputCooldown) return;
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      if (currentLane > 0) {
        currentLane--;
        targetX = LANE_POSITIONS[currentLane];
        inputCooldown = true;
        setTimeout(() => (inputCooldown = false), 150);
      }
    } else if (keys["ArrowRight"] || keys["KeyD"]) {
      if (currentLane < LANE_COUNT - 1) {
        currentLane++;
        targetX = LANE_POSITIONS[currentLane];
        inputCooldown = true;
        setTimeout(() => (inputCooldown = false), 150);
      }
    }
  }

  function handleGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;
    for (const gp of gamepads) {
      if (!gp) continue;
      if (gameState !== "playing") return;
      const axis = gp.axes[0] || 0;
      if (!gamepadLaneCooldown) {
        if (axis < -GAMEPAD_DEADZONE && currentLane > 0) {
          currentLane--;
          targetX = LANE_POSITIONS[currentLane];
          gamepadLaneCooldown = true;
          setTimeout(() => (gamepadLaneCooldown = false), 200);
        } else if (axis > GAMEPAD_DEADZONE && currentLane < LANE_COUNT - 1) {
          currentLane++;
          targetX = LANE_POSITIONS[currentLane];
          gamepadLaneCooldown = true;
          setTimeout(() => (gamepadLaneCooldown = false), 200);
        }
      }
    }
  }

  function handleTilt() {
    if (gameState !== "playing" || tiltLaneCooldown) return;
    if (deviceGamma < -TILT_THRESHOLD && currentLane > 0) {
      currentLane--;
      targetX = LANE_POSITIONS[currentLane];
      tiltLaneCooldown = true;
      setTimeout(() => (tiltLaneCooldown = false), 250);
    } else if (deviceGamma > TILT_THRESHOLD && currentLane < LANE_COUNT - 1) {
      currentLane++;
      targetX = LANE_POSITIONS[currentLane];
      tiltLaneCooldown = true;
      setTimeout(() => (tiltLaneCooldown = false), 250);
    }
  }

  // ─── Game lifecycle ───
  function start() {
    // Clear previous obstacles/scenery
    obstacles.forEach((obs) => sm.scene.remove(obs));
    obstacles = [];
    sceneryItems.forEach((item) => sm.scene.remove(item));
    sceneryItems = [];

    score = 0;
    speed = INITIAL_SPEED;
    currentLane = Math.floor(LANE_COUNT / 2);
    targetX = LANE_POSITIONS[currentLane];
    distanceTraveled = 0;
    gameTime = 0;
    shakeIntensity = 0;
    crashFlashAlpha = 0;
    lastNearMissZ = 0;
    livesRemaining = config.specialMechanic === "lives" ? (config.lives || 3) : 0;
    invincibleTimer = 0;
    countdownRemaining = config.specialMechanic === "countdown" ? (config.countdownSeconds || 60) : 0;

    car.position.set(LANE_POSITIONS[currentLane], 0, 0);
    car.rotation.z = 0;
    lastObstacleZ = car.position.z - 30;
    lastSceneryZ = car.position.z;

    roadSegments.forEach((seg, i) => {
      seg.position.z = -i * ROAD_SEGMENT_LENGTH;
    });

    gameState = "playing";
    cb.setPlaying(true);

    // Spectator
    if (!isRemix) {
      spectator.send({
        type: "race_start",
        userId: user.id,
        name: user.name,
      });
      spectator.startUpdates(() => ({
        userId: user.id,
        name: user.name,
        distance: distanceTraveled,
        speed,
      }));
    }

    // Commentary
    commentary.request("race_start", { name: user.name }).then((text) => {
      if (text) cb.setCommentaryText(text);
    });
  }

  async function gameOver() {
    gameState = "gameover";
    crashEffect.trigger(car.position);
    crashFlashAlpha = 1;
    shakeIntensity = 0.8;

    const finalScore = Math.floor(score);

    // Submit score
    let rank: number | null = null;
    rank = await submitScore(user.id, finalScore, config.id || undefined);

    // Refresh leaderboard
    const entries = await fetchLeaderboard(config.id || undefined);
    cb.setHudLeaderboard(entries);
    cb.onLeaderboardUpdate(entries);

    // Spectator
    if (!isRemix) {
      spectator.stopUpdates();
      spectator.send({
        type: "race_end",
        userId: user.id,
        name: user.name,
        score: finalScore,
        rank: rank || 0,
      });
      spectator.send({
        type: "leaderboard_update",
        entries,
      });
    }

    // Commentary
    if (rank !== null && rank <= 10) {
      commentary
        .request("top10", { name: user.name, score: finalScore, rank })
        .then((text) => {
          if (text) cb.setCommentaryText(text);
        });
    } else {
      commentary
        .request("crash", { name: user.name, score: finalScore, rank: rank || 0 })
        .then((text) => {
          if (text) cb.setCommentaryText(text);
        });
    }

    // Delay then signal game over to parent
    setTimeout(() => {
      cb.setPlaying(false);
      cb.onGameOver(finalScore, rank);
    }, 1200);
  }

  // ─── Animation loop ───
  const clock = new THREE.Clock();

  function animate() {
    if (disposed) return;
    animFrameId = requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    gameTime += dt;

    handleInput();
    handleGamepad();
    handleTilt();

    // Crash effect always updates
    crashEffect.update(dt);

    // Crash flash fade
    if (crashFlashAlpha > 0) {
      crashFlashAlpha = Math.max(0, crashFlashAlpha - dt * 3);
      cb.setFlashAlpha(crashFlashAlpha);
    }

    if (gameState === "playing") {
      // Move car forward
      car.position.z -= speed * dt;
      distanceTraveled += speed * dt;
      score = distanceTraveled;

      // Increase speed
      speed = Math.min(MAX_SPEED, speed + SPEED_INCREMENT * dt);

      // Smooth lane switching
      car.position.x += (targetX - car.position.x) * LANE_SWITCH_SPEED * dt;

      // Car tilt
      const tiltTarget = (targetX - car.position.x) * 0.15;
      car.rotation.z += (tiltTarget - car.rotation.z) * 5 * dt;

      // Slight bob
      car.position.y = Math.sin(gameTime * 8) * 0.015;

      // Spawn / despawn obstacles
      lastObstacleZ = spawnObstacles({
        car,
        obstacles,
        scene: sm.scene,
        lastObstacleZ,
        distanceTraveled,
        speed,
        config,
        constants,
        obstacleColors,
      });
      obstacles = despawnObstacles(car, obstacles, sm.scene);

      // Scenery
      const sceneryResult = spawnScenery({
        car,
        sceneryItems,
        scene: sm.scene,
        lastSceneryZ,
        config,
        constants,
      });
      sceneryItems = sceneryResult.items;
      lastSceneryZ = sceneryResult.lastZ;

      // Recycle road segments
      roadSegments.forEach((seg) => {
        if (seg.position.z > car.position.z + ROAD_SEGMENT_LENGTH) {
          seg.position.z -= ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH;
        }
      });

      // Moving obstacles mechanic
      if (config.specialMechanic === "moving_obstacles") {
        const moveSpeed = config.obstacleMovementSpeed || 2;
        for (const obs of obstacles) {
          if (!obs.userData.moveDir) {
            obs.userData.moveDir = Math.random() < 0.5 ? -1 : 1;
          }
          obs.position.x += obs.userData.moveDir * moveSpeed * dt;
          if (obs.position.x > ROAD_WIDTH / 2 - 1) obs.userData.moveDir = -1;
          if (obs.position.x < -ROAD_WIDTH / 2 + 1) obs.userData.moveDir = 1;
        }
      }

      // Tick down invincibility timer
      if (invincibleTimer > 0) {
        invincibleTimer -= dt;
        // Flash the car to indicate invincibility
        car.visible = Math.floor(invincibleTimer * 10) % 2 === 0;
      } else {
        car.visible = true;
      }

      // Collision (skip while invincible)
      if (
        invincibleTimer <= 0 &&
        checkCollision(car.position, CAR_WIDTH, CAR_LENGTH, HITBOX_SHRINK, obstacles)
      ) {
        if (config.specialMechanic === "lives" && livesRemaining > 1) {
          livesRemaining--;
          invincibleTimer = INVINCIBLE_DURATION;
          shakeIntensity = 0.4;
        } else {
          gameOver();
        }
      }

      // Countdown mechanic
      if (config.specialMechanic === "countdown") {
        countdownRemaining -= dt;
        if (countdownRemaining <= 0) {
          gameOver();
        }
      }

      // Near miss (for commentary triggers)
      const nearMissResult = checkNearMiss(
        car.position,
        CAR_WIDTH,
        HITBOX_SHRINK,
        NEAR_MISS_THRESHOLD,
        obstacles,
        lastNearMissZ
      );
      lastNearMissZ = nearMissResult.newLastZ;

      // Commentary milestones
      const currentKmh = Math.floor(speed * 3.6);
      commentary.checkMilestones(currentKmh, distanceTraveled);

      // Speed lines
      speedLines.update(dt, car.position, speed, INITIAL_SPEED, MAX_SPEED);

      // Underglow follows car
      sm.underGlow.position.set(car.position.x, 0.3, car.position.z);

      // Dynamic FOV
      const speedRatio = (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
      sm.camera.fov = 60 + speedRatio * 15;
      sm.camera.updateProjectionMatrix();

      // Camera follow with shake
      const baseZ = car.position.z + 8;
      const baseX = car.position.x * 0.3;
      const shakeX = shakeIntensity * (Math.random() - 0.5) * 2;
      const shakeY = shakeIntensity * (Math.random() - 0.5) * 1;

      sm.camera.position.z = baseZ + shakeY * 0.5;
      sm.camera.position.x += (baseX - sm.camera.position.x) * 3 * dt + shakeX;
      sm.camera.position.y = 6 + shakeY;
      sm.camera.lookAt(
        car.position.x * 0.2 + shakeX * 0.3,
        1,
        car.position.z - 15
      );

      // Decay shake
      shakeIntensity *= shakeDecay;
      if (shakeIntensity < 0.001) shakeIntensity = 0;

      // Move directional light with car
      sm.dirLight.position.z = car.position.z - 5;
      sm.dirLight.target.position.z = car.position.z - 10;
      sm.dirLight.target.updateMatrixWorld();

      // Move starfield with camera
      sm.starfield.position.z = car.position.z;

      // Update HUD state
      cb.setHudScore(score);
      cb.setHudSpeed(speed);
      if (config.specialMechanic === "lives") {
        cb.setHudLives(livesRemaining);
      }
      if (config.specialMechanic === "countdown") {
        cb.setHudCountdown(countdownRemaining);
      }
    }

    sm.render();
  }

  // Start render loop
  animate();

  // Resize immediately
  sm.resize(window.innerWidth, window.innerHeight);

  // ─── Dispose ───
  function dispose() {
    disposed = true;
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId);
    }
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("deviceorientation", onDeviceOrientation);
    document.removeEventListener("click", tiltClickHandler);
    spectator.disconnect();
    sm.renderer.dispose();
  }

  return {
    start,
    dispose,
    moveLeft,
    moveRight,
    commentary,
  };
}
