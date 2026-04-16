import * as THREE from "three";

// ─── CONSTANTS ───────────────────────────────────────────────
const LANE_COUNT = 5;
const LANE_WIDTH = 2.5;
const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH;
const LANE_POSITIONS: number[] = [];
for (let i = 0; i < LANE_COUNT; i++) {
  LANE_POSITIONS.push((i - Math.floor(LANE_COUNT / 2)) * LANE_WIDTH);
}

const INITIAL_SPEED = 18;
const MAX_SPEED = 55;
const SPEED_INCREMENT = 0.8;
const LANE_SWITCH_SPEED = 12;

const OBSTACLE_SPAWN_DISTANCE = 120;
const MIN_OBSTACLE_GAP = 8;

const CAR_WIDTH = 1.8;
const CAR_HEIGHT = 0.8;
const CAR_LENGTH = 3.5;
const HITBOX_SHRINK = 0.3;

// ─── USER & LEADERBOARD ──────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
}
interface LeaderboardEntry {
  name: string;
  score: number;
  created_at: string;
}

let currentUser: User | null = null;
let leaderboardData: LeaderboardEntry[] = [];

async function fetchLeaderboard(): Promise<void> {
  try {
    const res = await fetch("/api/leaderboard?limit=10");
    if (res.ok) {
      const data = await res.json() as { entries: LeaderboardEntry[] };
      leaderboardData = data.entries;
      renderHUDLeaderboard();
    }
  } catch {
    // silent fail
  }
}

function renderHUDLeaderboard(): void {
  const container = document.getElementById("leaderboard-entries")!;
  // HUD only shows top 5
  const top5 = leaderboardData.slice(0, 5);
  if (top5.length === 0) {
    container.innerHTML = `<div class="lb-entry" style="color: #444;">No scores yet</div>`;
    return;
  }
  container.innerHTML = top5
    .map(
      (entry, i) =>
        `<div class="lb-entry">
          <span><span class="rank">#${i + 1}</span>${entry.name}</span>
          <span>${entry.score.toLocaleString()}</span>
        </div>`
    )
    .join("");
}

async function submitScore(userId: string, finalScore: number): Promise<number | null> {
  try {
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, score: finalScore }),
    });
    if (res.ok) {
      const data = await res.json() as { score: number; rank: number };
      // Refresh leaderboard after submit
      fetchLeaderboard();
      return data.rank;
    }
  } catch {
    // silent fail
  }
  return null;
}

// ─── LOGIN FORM ──────────────────────────────────────────────
const loginForm = document.getElementById("login-form") as HTMLFormElement;
const loginNameInput = document.getElementById("login-name") as HTMLInputElement;
const loginEmailInput = document.getElementById("login-email") as HTMLInputElement;
const loginError = document.getElementById("login-error")!;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = loginNameInput.value.trim();
  const email = loginEmailInput.value.trim();
  if (!name || !email) return;

  const btn = loginForm.querySelector("button")!;
  btn.disabled = true;
  btn.textContent = "LOADING...";
  loginError.textContent = "";

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    const data = await res.json() as User & { error?: string };
    if (!res.ok) {
      loginError.textContent = data.error || "Login failed";
      btn.disabled = false;
      btn.textContent = "CONTINUE";
      return;
    }
    currentUser = { id: data.id, name: data.name, email: data.email };
    showLobby();
  } catch {
    loginError.textContent = "Connection error";
    btn.disabled = false;
    btn.textContent = "CONTINUE";
  }
});

// ─── LOBBY SCREEN ────────────────────────────────────────────
const lobbyScreen = document.getElementById("lobby-screen")!;
const lobbyPlayerName = document.getElementById("lobby-player-name")!;
const lobbyLeaderboardEntries = document.getElementById("lobby-leaderboard-entries")!;
const lobbyStartBtn = document.getElementById("lobby-start-btn")!;
const commentaryToggle = document.getElementById("commentary-toggle") as HTMLInputElement;

function showLobby(crashScore?: number, crashRank?: number | null): void {
  document.getElementById("start-screen")!.style.display = "none";
  lobbyScreen.style.display = "flex";
  gameState = "start";

  // Show player name
  if (currentUser) {
    lobbyPlayerName.textContent = `Playing as ${currentUser.name}`;
  }

  // Crash result section
  const crashResult = document.getElementById("lobby-crash-result")!;
  if (crashScore !== undefined) {
    crashResult.classList.add("visible");
    document.getElementById("lobby-crash-score")!.textContent = String(crashScore);

    const rankEl = document.getElementById("lobby-crash-rank")!;
    const congratsEl = document.getElementById("lobby-crash-congrats")!;

    if (crashRank) {
      rankEl.textContent = `Rank #${crashRank}`;
      if (crashRank === 1) {
        congratsEl.textContent = "NEW HIGH SCORE!";
      } else if (crashRank <= 10) {
        congratsEl.textContent = "TOP 10 FINISH!";
      } else {
        congratsEl.textContent = "";
      }
    } else {
      rankEl.textContent = "";
      congratsEl.textContent = "";
    }

    lobbyStartBtn.textContent = "Race Again";
  } else {
    crashResult.classList.remove("visible");
    lobbyStartBtn.textContent = "Start Race";
  }

  // Render leaderboard in lobby
  renderLobbyLeaderboard();
}

function renderLobbyLeaderboard(): void {
  if (leaderboardData.length === 0) {
    lobbyLeaderboardEntries.innerHTML = `<div class="lb-entry" style="color: #444;">No scores yet</div>`;
    return;
  }
  lobbyLeaderboardEntries.innerHTML = leaderboardData
    .slice(0, 10)
    .map(
      (entry, i) => {
        const isYou = currentUser && entry.name === currentUser.name;
        return `<div class="lb-entry${isYou ? " is-you" : ""}">
          <span><span class="rank">#${i + 1}</span>${entry.name}${isYou ? " (you)" : ""}</span>
          <span>${entry.score.toLocaleString()}</span>
        </div>`;
      }
    )
    .join("");
}

lobbyStartBtn.addEventListener("click", () => {
  startGame();
});

// Sync commentary toggle
commentaryToggle.addEventListener("change", () => {
  commentaryEnabled = commentaryToggle.checked;
  ttsEnabled = commentaryToggle.checked;
});

// Fetch leaderboard on page load
fetchLeaderboard();
// Poll leaderboard every 10s
setInterval(fetchLeaderboard, 10000);

// ─── SPECTATOR HUB WEBSOCKET ────────────────────────────────
let spectatorWs: WebSocket | null = null;
let spectatorUpdateInterval: ReturnType<typeof setInterval> | null = null;

function connectSpectatorHub(): void {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  spectatorWs = new WebSocket(`${protocol}//${location.host}/ws/spectator?type=game`);

  spectatorWs.onopen = () => {
    // If we reconnected mid-race, re-register with the spectator hub
    if (gameState === "playing" && currentUser) {
      sendSpectatorEvent({
        type: "race_start",
        userId: currentUser.id,
        name: currentUser.name,
      });
      startSpectatorUpdates();
    }
  };
  spectatorWs.onclose = () => {
    spectatorWs = null;
    setTimeout(connectSpectatorHub, 3000);
  };
  spectatorWs.onerror = () => {
    spectatorWs?.close();
  };
}

function sendSpectatorEvent(data: Record<string, unknown>): void {
  if (spectatorWs?.readyState === WebSocket.OPEN) {
    spectatorWs.send(JSON.stringify(data));
  }
}

function startSpectatorUpdates(): void {
  // Send live distance updates every 500ms
  if (spectatorUpdateInterval) clearInterval(spectatorUpdateInterval);
  spectatorUpdateInterval = setInterval(() => {
    if (gameState === "playing" && currentUser) {
      sendSpectatorEvent({
        type: "race_update",
        userId: currentUser.id,
        name: currentUser.name,
        distance: distanceTraveled,
        speed,
      });
    }
  }, 500);
}

function stopSpectatorUpdates(): void {
  if (spectatorUpdateInterval) {
    clearInterval(spectatorUpdateInterval);
    spectatorUpdateInterval = null;
  }
}

// Connect on page load
connectSpectatorHub();

// ─── AI COMMENTARY ───────────────────────────────────────────
const commentaryOverlay = document.getElementById("commentary-overlay")!;
const commentaryText = document.getElementById("commentary-text")!;
let commentaryTimer: ReturnType<typeof setTimeout> | null = null;
let commentaryInFlight = false;
let commentaryEnabled = false;
let lastSpeedMilestone = 0;
let lastDistanceMilestone = 0;

async function requestCommentary(
  event: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  // Skip if commentary is disabled or a request is already pending
  if (!commentaryEnabled || commentaryInFlight) return;
  commentaryInFlight = true;

  try {
    const res = await fetch("/api/commentary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, context }),
    });
    if (res.ok) {
      const data = (await res.json()) as { commentary: string };
      if (data.commentary) {
        showCommentary(data.commentary);
        speakCommentary(data.commentary);
      }
    }
  } catch {
    // silent fail
  } finally {
    commentaryInFlight = false;
  }
}

function showCommentary(text: string): void {
  // Clear existing timer
  if (commentaryTimer) clearTimeout(commentaryTimer);

  commentaryText.textContent = text;
  commentaryOverlay.classList.add("visible");

  // Hide after 4 seconds
  commentaryTimer = setTimeout(() => {
    commentaryOverlay.classList.remove("visible");
  }, 4000);
}

// ─── BROWSER TTS ─────────────────────────────────────────────
let ttsEnabled = false;

function speakCommentary(text: string): void {
  if (!ttsEnabled || !window.speechSynthesis) return;

  // Cancel any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.1;
  utterance.pitch = 1.05;
  utterance.volume = 0.9;

  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Daniel")
  ) || voices.find(
    (v) => v.lang.startsWith("en") && !v.name.includes("Google")
  ) || voices.find(
    (v) => v.lang.startsWith("en")
  );
  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

// Preload voices (some browsers load them async)
if (window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// ─── STATE ───────────────────────────────────────────────────
let gameState: "start" | "playing" | "gameover" = "start";
let score = 0;
let speed = INITIAL_SPEED;
let currentLane = Math.floor(LANE_COUNT / 2);
let targetX = LANE_POSITIONS[currentLane];
let distanceTraveled = 0;
let lastObstacleZ = -30;
let obstacles: THREE.Object3D[] = [];
let roadSegments: THREE.Group[] = [];
let sceneryItems: THREE.Object3D[] = [];
let inputCooldown = false;
let gameTime = 0;

// Camera shake
let shakeIntensity = 0;
const shakeDecay = 0.92;

// Crash effect
let crashFlashAlpha = 0;

// ─── THREE.JS SETUP ─────────────────────────────────────────
const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1e, 0.012);
scene.background = new THREE.Color(0x0a0a1e);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);
camera.position.set(0, 6, 8);
camera.lookAt(0, 0, -15);

// ─── STARFIELD ───────────────────────────────────────────────
function createStarfield(): THREE.Points {
  const starCount = 2000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 150 + Math.random() * 50;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // only upper hemisphere
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });
  return new THREE.Points(geo, mat);
}
const starfield = createStarfield();
scene.add(starfield);

// ─── LIGHTING ────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x303050, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff0dd, 0.8);
dirLight.position.set(5, 15, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 50;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x4466aa, 0x332211, 0.3);
scene.add(hemiLight);

// Orange underglow on the car area
const underGlow = new THREE.PointLight(0xf97316, 1.5, 15);
underGlow.position.set(0, 0.5, 0);
scene.add(underGlow);

// ─── SPEED LINES (Particle System) ──────────────────────────
const SPEED_LINE_COUNT = 200;
const speedLineGeo = new THREE.BufferGeometry();
const speedLinePositions = new Float32Array(SPEED_LINE_COUNT * 3);
const speedLineVelocities: number[] = [];

for (let i = 0; i < SPEED_LINE_COUNT; i++) {
  speedLinePositions[i * 3] = (Math.random() - 0.5) * 30;
  speedLinePositions[i * 3 + 1] = Math.random() * 4 + 0.5;
  speedLinePositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
  speedLineVelocities.push(0.5 + Math.random() * 0.5);
}
speedLineGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(speedLinePositions, 3)
);
const speedLineMat = new THREE.PointsMaterial({
  color: 0xaaccff,
  size: 0.08,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
});
const speedLines = new THREE.Points(speedLineGeo, speedLineMat);
scene.add(speedLines);

// ─── CRASH PARTICLES ─────────────────────────────────────────
const CRASH_PARTICLE_COUNT = 80;
const crashParticleGeo = new THREE.BufferGeometry();
const crashPositions = new Float32Array(CRASH_PARTICLE_COUNT * 3);
const crashVelocities: THREE.Vector3[] = [];
const crashColors = new Float32Array(CRASH_PARTICLE_COUNT * 3);
let crashActive = false;
let crashTime = 0;

for (let i = 0; i < CRASH_PARTICLE_COUNT; i++) {
  crashPositions[i * 3] = 0;
  crashPositions[i * 3 + 1] = 0;
  crashPositions[i * 3 + 2] = 0;
  crashVelocities.push(new THREE.Vector3());
  // Orange to red gradient
  const t = Math.random();
  crashColors[i * 3] = 1;
  crashColors[i * 3 + 1] = 0.3 + t * 0.4;
  crashColors[i * 3 + 2] = t * 0.1;
}
crashParticleGeo.setAttribute(
  "position",
  new THREE.BufferAttribute(crashPositions, 3)
);
crashParticleGeo.setAttribute(
  "color",
  new THREE.BufferAttribute(crashColors, 3)
);
const crashParticleMat = new THREE.PointsMaterial({
  size: 0.3,
  vertexColors: true,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
});
const crashParticles = new THREE.Points(crashParticleGeo, crashParticleMat);
scene.add(crashParticles);

function triggerCrashEffect(): void {
  crashActive = true;
  crashTime = 0;
  crashFlashAlpha = 1;
  shakeIntensity = 0.8;
  const pos = crashParticleGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < CRASH_PARTICLE_COUNT; i++) {
    pos.setXYZ(i, car.position.x, 1, car.position.z);
    crashVelocities[i].set(
      (Math.random() - 0.5) * 15,
      Math.random() * 10 + 2,
      (Math.random() - 0.5) * 15
    );
  }
  pos.needsUpdate = true;
  crashParticleMat.opacity = 1;
}

function updateCrashParticles(dt: number): void {
  if (!crashActive) return;
  crashTime += dt;
  const pos = crashParticleGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < CRASH_PARTICLE_COUNT; i++) {
    crashVelocities[i].y -= 15 * dt; // gravity
    pos.setX(i, pos.getX(i) + crashVelocities[i].x * dt);
    pos.setY(i, pos.getY(i) + crashVelocities[i].y * dt);
    pos.setZ(i, pos.getZ(i) + crashVelocities[i].z * dt);
  }
  pos.needsUpdate = true;
  crashParticleMat.opacity = Math.max(0, 1 - crashTime * 1.5);
  if (crashTime > 1.5) crashActive = false;
}

// ─── CAR MODEL ───────────────────────────────────────────────
function createCar(): THREE.Group {
  const group = new THREE.Group();

  // Main body — lower section
  const bodyGeo = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT * 0.6, CAR_LENGTH);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    metalness: 0.7,
    roughness: 0.2,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = CAR_HEIGHT * 0.3 + 0.35;
  body.castShadow = true;
  group.add(body);

  // Hood (front slopes down slightly)
  const hoodGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.95, CAR_HEIGHT * 0.3, CAR_LENGTH * 0.35);
  const hoodMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    metalness: 0.7,
    roughness: 0.2,
  });
  const hood = new THREE.Mesh(hoodGeo, hoodMat);
  hood.position.y = CAR_HEIGHT * 0.6 + 0.35;
  hood.position.z = -CAR_LENGTH * 0.25;
  hood.castShadow = true;
  group.add(hood);

  // Cabin (windshield area)
  const cabinGeo = new THREE.BoxGeometry(
    CAR_WIDTH * 0.8,
    CAR_HEIGHT * 0.55,
    CAR_LENGTH * 0.35
  );
  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.9,
    roughness: 0.1,
    transparent: true,
    opacity: 0.85,
  });
  const cabin = new THREE.Mesh(cabinGeo, cabinMat);
  cabin.position.y = CAR_HEIGHT * 0.6 + CAR_HEIGHT * 0.275 + 0.35;
  cabin.position.z = CAR_LENGTH * 0.05;
  cabin.castShadow = true;
  group.add(cabin);

  // Spoiler
  const spoilerWingGeo = new THREE.BoxGeometry(CAR_WIDTH * 0.9, 0.06, 0.4);
  const spoilerMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.8,
    roughness: 0.3,
  });
  const spoilerWing = new THREE.Mesh(spoilerWingGeo, spoilerMat);
  spoilerWing.position.y = CAR_HEIGHT + 0.7;
  spoilerWing.position.z = CAR_LENGTH * 0.42;
  spoilerWing.castShadow = true;
  group.add(spoilerWing);

  // Spoiler supports
  [-0.5, 0.5].forEach((x) => {
    const supportGeo = new THREE.BoxGeometry(0.08, 0.35, 0.08);
    const support = new THREE.Mesh(supportGeo, spoilerMat);
    support.position.set(x, CAR_HEIGHT + 0.5, CAR_LENGTH * 0.42);
    group.add(support);
  });

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.5,
    roughness: 0.6,
  });
  const rimGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.23, 8);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    metalness: 0.9,
    roughness: 0.1,
  });
  const wheelPositions: [number, number, number][] = [
    [-CAR_WIDTH / 2 - 0.12, 0.32, CAR_LENGTH * 0.3],
    [CAR_WIDTH / 2 + 0.12, 0.32, CAR_LENGTH * 0.3],
    [-CAR_WIDTH / 2 - 0.12, 0.32, -CAR_LENGTH * 0.3],
    [CAR_WIDTH / 2 + 0.12, 0.32, -CAR_LENGTH * 0.3],
  ];
  wheelPositions.forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    group.add(wheel);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x, y, z);
    group.add(rim);
  });

  // Headlights (bright)
  const headlightGeo = new THREE.BoxGeometry(0.3, 0.12, 0.05);
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xffffee,
    emissive: 0xffffcc,
    emissiveIntensity: 3,
  });
  [-0.55, 0.55].forEach((x) => {
    const hl = new THREE.Mesh(headlightGeo, headlightMat);
    hl.position.set(x, CAR_HEIGHT * 0.4 + 0.35, -CAR_LENGTH / 2 - 0.02);
    group.add(hl);
  });

  // Headlight glow
  const headlightGlow = new THREE.PointLight(0xffffcc, 2, 20);
  headlightGlow.position.set(0, 0.7, -CAR_LENGTH / 2 - 1);
  group.add(headlightGlow);

  // Taillights (red glow)
  const taillightGeo = new THREE.BoxGeometry(0.35, 0.1, 0.05);
  const taillightMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2,
  });
  [-0.55, 0.55].forEach((x) => {
    const tl = new THREE.Mesh(taillightGeo, taillightMat);
    tl.position.set(x, CAR_HEIGHT * 0.4 + 0.35, CAR_LENGTH / 2 + 0.02);
    group.add(tl);
  });

  return group;
}

const car = createCar();
car.position.set(LANE_POSITIONS[currentLane], 0, 0);
scene.add(car);

// ─── ROAD ────────────────────────────────────────────────────
const ROAD_SEGMENT_LENGTH = 40;
const ROAD_SEGMENT_COUNT = 5;

function createRoadSegment(zOffset: number): THREE.Group {
  const group = new THREE.Group();

  // Road surface — dark asphalt with slight sheen
  const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH + 2, ROAD_SEGMENT_LENGTH);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x222230,
    roughness: 0.7,
    metalness: 0.15,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.receiveShadow = true;
  group.add(road);

  // Lane dividers — dashed white lines
  const dividerGeo = new THREE.PlaneGeometry(0.12, 2.5);
  const dividerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.3,
  });
  for (let i = 1; i < LANE_COUNT; i++) {
    const x = LANE_POSITIONS[i] - LANE_WIDTH / 2;
    for (
      let d = -ROAD_SEGMENT_LENGTH / 2;
      d < ROAD_SEGMENT_LENGTH / 2;
      d += 5
    ) {
      const divider = new THREE.Mesh(dividerGeo, dividerMat);
      divider.rotation.x = -Math.PI / 2;
      divider.position.set(x, 0.02, d);
      group.add(divider);
    }
  }

  // Road edge lines (solid white)
  const edgeLineGeo = new THREE.PlaneGeometry(0.15, ROAD_SEGMENT_LENGTH);
  const edgeLineMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.2,
  });
  [-1, 1].forEach((side) => {
    const line = new THREE.Mesh(edgeLineGeo, edgeLineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(side * (ROAD_WIDTH / 2 + 0.5), 0.02, 0);
    group.add(line);
  });

  // Curbs — orange/white alternating look
  const curbGeo = new THREE.BoxGeometry(0.3, 0.15, ROAD_SEGMENT_LENGTH);
  const curbMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xf97316,
    emissiveIntensity: 0.15,
  });
  [-1, 1].forEach((side) => {
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.set(side * (ROAD_WIDTH / 2 + 1.15), 0.075, 0);
    group.add(curb);
  });

  // Ground plane on sides — darker
  const groundGeo = new THREE.PlaneGeometry(40, ROAD_SEGMENT_LENGTH);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a120a,
    roughness: 1,
  });
  [-1, 1].forEach((side) => {
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(side * (ROAD_WIDTH / 2 + 21), -0.01, 0);
    ground.receiveShadow = true;
    group.add(ground);
  });

  // Streetlights every ~20 units
  const lightPoleGeo = new THREE.CylinderGeometry(0.08, 0.1, 5, 6);
  const lightPoleMat = new THREE.MeshStandardMaterial({
    color: 0x444444,
    metalness: 0.7,
    roughness: 0.3,
  });
  const lightHeadGeo = new THREE.BoxGeometry(0.3, 0.1, 0.5);
  const lightHeadMat = new THREE.MeshStandardMaterial({
    color: 0xffcc88,
    emissive: 0xffcc88,
    emissiveIntensity: 1.5,
  });

  for (let d = -ROAD_SEGMENT_LENGTH / 2 + 5; d < ROAD_SEGMENT_LENGTH / 2; d += 20) {
    [-1, 1].forEach((side) => {
      const pole = new THREE.Mesh(lightPoleGeo, lightPoleMat);
      pole.position.set(side * (ROAD_WIDTH / 2 + 2), 2.5, d);
      group.add(pole);

      const head = new THREE.Mesh(lightHeadGeo, lightHeadMat);
      head.position.set(side * (ROAD_WIDTH / 2 + 1.5), 5, d);
      group.add(head);

      // Actual point light (dim, warm)
      const streetLight = new THREE.PointLight(0xffcc88, 0.6, 12);
      streetLight.position.set(side * (ROAD_WIDTH / 2 + 1.5), 4.8, d);
      group.add(streetLight);
    });
  }

  group.position.z = zOffset;
  return group;
}

for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
  const seg = createRoadSegment(-i * ROAD_SEGMENT_LENGTH);
  roadSegments.push(seg);
  scene.add(seg);
}

// ─── OBSTACLES ───────────────────────────────────────────────
const OBSTACLE_COLORS = [0xef4444, 0x3b82f6, 0x8b5cf6, 0x10b981, 0xeab308];

function createObstacle(lane: number, z: number): THREE.Object3D {
  const type = Math.random();
  let mesh: THREE.Object3D;

  if (type < 0.5) {
    // Other car — with taillights
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(1.6, 0.7, 3);
    const color =
      OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)];
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.6,
      roughness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    const cabinGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.y = 1.3;
    cabin.position.z = 0.2;
    cabin.castShadow = true;
    group.add(cabin);

    // Taillights on obstacle cars
    const tlGeo = new THREE.BoxGeometry(0.25, 0.08, 0.04);
    const tlMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1.5,
    });
    [-0.5, 0.5].forEach((x) => {
      const tl = new THREE.Mesh(tlGeo, tlMat);
      tl.position.set(x, 0.6, 1.52);
      group.add(tl);
    });

    mesh = group;
    mesh.userData = { type: "car", width: 1.6, length: 3, height: 1.5 };
  } else if (type < 0.8) {
    // Barrier with warning stripes
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(2.2, 0.8, 0.6);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.3,
    });
    const barrier = new THREE.Mesh(geo, mat);
    barrier.position.y = 0.4;
    barrier.castShadow = true;
    group.add(barrier);

    // Reflective strip
    const stripGeo = new THREE.BoxGeometry(2.22, 0.08, 0.62);
    const stripMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.5,
    });
    const strip = new THREE.Mesh(stripGeo, stripMat);
    strip.position.y = 0.6;
    group.add(strip);

    mesh = group;
    mesh.userData = {
      type: "barrier",
      width: 2.2,
      length: 0.6,
      height: 0.8,
    };
  } else {
    // Traffic cone with reflective band
    const group = new THREE.Group();
    const coneGeo = new THREE.ConeGeometry(0.25, 0.8, 8);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 0.15,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.y = 0.4;
    cone.castShadow = true;
    group.add(cone);

    // Reflective bands
    const bandGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.08, 8);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
    });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.y = 0.45;
    group.add(band);

    mesh = group;
    mesh.userData = { type: "cone", width: 0.5, length: 0.5, height: 0.8 };
  }

  mesh.position.x = LANE_POSITIONS[lane];
  mesh.position.z = z;
  return mesh;
}

function spawnObstacles(): void {
  const spawnLimit = car.position.z - OBSTACLE_SPAWN_DISTANCE;

  while (lastObstacleZ > spawnLimit) {
    const difficulty = Math.min(distanceTraveled / 500, 1);
    const multiLaneChance = 0.35 + difficulty * 0.35;
    const triLaneChance = difficulty * 0.2;

    let blockedCount = 1;
    if (Math.random() < triLaneChance && LANE_COUNT > 3) {
      blockedCount = 3;
    } else if (Math.random() < multiLaneChance) {
      blockedCount = 2;
    }
    blockedCount = Math.min(blockedCount, LANE_COUNT - 1);

    const blockedLanes = new Set<number>();
    while (blockedLanes.size < blockedCount) {
      blockedLanes.add(Math.floor(Math.random() * LANE_COUNT));
    }

    blockedLanes.forEach((lane) => {
      const obs = createObstacle(lane, lastObstacleZ);
      obstacles.push(obs);
      scene.add(obs);
    });

    const gap = Math.max(MIN_OBSTACLE_GAP, 20 - speed * 0.2);
    lastObstacleZ -= gap;
  }
}

function despawnObstacles(): void {
  const despawnZ = car.position.z + 30;
  obstacles = obstacles.filter((obs) => {
    if (obs.position.z < despawnZ) return true;
    scene.remove(obs);
    return false;
  });
}

// ─── SCENERY ─────────────────────────────────────────────────
let lastSceneryZ = 0;

function createBuilding(side: number, z: number): THREE.Group {
  const group = new THREE.Group();
  const height = 4 + Math.random() * 12;
  const width = 2 + Math.random() * 4;
  const depth = 2 + Math.random() * 4;

  // Main structure
  const geo = new THREE.BoxGeometry(width, height, depth);
  const hue = 0.6 + Math.random() * 0.15;
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(hue, 0.12, 0.08 + Math.random() * 0.06),
    roughness: 0.85,
    metalness: 0.2,
  });
  const building = new THREE.Mesh(geo, mat);
  building.position.y = height / 2;
  building.castShadow = true;
  group.add(building);

  // Glowing windows
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffdd88,
    emissive: 0xffcc66,
    emissiveIntensity: 0.6,
  });
  const windowSize = 0.3;
  const windowGeo = new THREE.PlaneGeometry(windowSize, windowSize * 1.3);
  const facingX = side > 0 ? -1 : 1; // face toward road

  for (let wy = 1.5; wy < height - 0.5; wy += 1.8) {
    for (let wz = -depth / 2 + 0.5; wz < depth / 2 - 0.3; wz += 1.2) {
      if (Math.random() < 0.6) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(facingX * (width / 2 + 0.01), wy, wz);
        win.rotation.y = facingX > 0 ? 0 : Math.PI;
        group.add(win);
      }
    }
  }

  group.position.set(
    side * (ROAD_WIDTH / 2 + 3.5 + Math.random() * 6),
    0,
    z + (Math.random() - 0.5) * 8
  );
  return group;
}

function spawnScenery(): void {
  const spawnZ = car.position.z - 140;

  while (lastSceneryZ > spawnZ) {
    ([-1, 1] as const).forEach((side) => {
      if (Math.random() < 0.5) {
        const building = createBuilding(side, lastSceneryZ);
        sceneryItems.push(building);
        scene.add(building);
      }
    });
    lastSceneryZ -= 12;
  }

  sceneryItems = sceneryItems.filter((item) => {
    if (item.position.z < car.position.z + 40) return true;
    scene.remove(item);
    return false;
  });
}

// ─── COLLISION DETECTION ─────────────────────────────────────
function checkCollision(): boolean {
  const carMinX = car.position.x - CAR_WIDTH / 2 + HITBOX_SHRINK;
  const carMaxX = car.position.x + CAR_WIDTH / 2 - HITBOX_SHRINK;
  const carMinZ = car.position.z - CAR_LENGTH / 2 + HITBOX_SHRINK;
  const carMaxZ = car.position.z + CAR_LENGTH / 2 - HITBOX_SHRINK;

  for (const obs of obstacles) {
    const data = obs.userData;
    const obsMinX = obs.position.x - data.width / 2;
    const obsMaxX = obs.position.x + data.width / 2;
    const obsMinZ = obs.position.z - data.length / 2;
    const obsMaxZ = obs.position.z + data.length / 2;

    if (
      carMinX < obsMaxX &&
      carMaxX > obsMinX &&
      carMinZ < obsMaxZ &&
      carMaxZ > obsMinZ
    ) {
      return true;
    }
  }
  return false;
}

// ─── NEAR-MISS DETECTION ─────────────────────────────────────
const NEAR_MISS_THRESHOLD = 0.8;
let lastNearMissZ = 0;

function checkNearMiss(): boolean {
  const carMinX = car.position.x - CAR_WIDTH / 2 - NEAR_MISS_THRESHOLD;
  const carMaxX = car.position.x + CAR_WIDTH / 2 + NEAR_MISS_THRESHOLD;

  for (const obs of obstacles) {
    const data = obs.userData;
    // Only check obstacles we're passing right now
    if (Math.abs(obs.position.z - car.position.z) > data.length) continue;
    if (obs.position.z === lastNearMissZ) continue;

    const obsMinX = obs.position.x - data.width / 2;
    const obsMaxX = obs.position.x + data.width / 2;

    // Close in X but not colliding
    if (carMinX < obsMaxX && carMaxX > obsMinX) {
      const actualCarMinX = car.position.x - CAR_WIDTH / 2 + HITBOX_SHRINK;
      const actualCarMaxX = car.position.x + CAR_WIDTH / 2 - HITBOX_SHRINK;
      if (!(actualCarMinX < obsMaxX && actualCarMaxX > obsMinX)) {
        lastNearMissZ = obs.position.z;
        return true;
      }
    }
  }
  return false;
}

// ─── INPUT ───────────────────────────────────────────────────
const keys: Record<string, boolean> = {};
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  // Lobby: Enter/Space starts the race (only if lobby is visible)
  if (
    gameState === "start" &&
    lobbyScreen.style.display === "flex" &&
    (e.code === "Enter" || e.code === "Space")
  ) {
    startGame();
  }
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});

function handleInput(): void {
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

// ─── GAMEPAD ─────────────────────────────────────────────────
const GAMEPAD_DEADZONE = 0.3;
let gamepadLaneCooldown = false;

function handleGamepad(): void {
  const gamepads = navigator.getGamepads();
  if (!gamepads) return;
  for (const gp of gamepads) {
    if (!gp) continue;
    // Gamepad button: lobby -> start game
    if (gameState === "start" && lobbyScreen.style.display === "flex") {
      for (const btn of gp.buttons) {
        if (btn.pressed) {
          startGame();
          return;
        }
      }
    }
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

// ─── GAME LIFECYCLE ──────────────────────────────────────────
function startGame(): void {
  // Reset game state
  obstacles.forEach((obs) => scene.remove(obs));
  obstacles = [];
  sceneryItems.forEach((item) => scene.remove(item));
  sceneryItems = [];

  score = 0;
  speed = INITIAL_SPEED;
  currentLane = Math.floor(LANE_COUNT / 2);
  targetX = LANE_POSITIONS[currentLane];
  distanceTraveled = 0;
  gameTime = 0;
  shakeIntensity = 0;
  crashActive = false;
  crashFlashAlpha = 0;
  lastNearMissZ = 0;
  lastSpeedMilestone = 0;
  lastDistanceMilestone = 0;

  car.position.set(LANE_POSITIONS[currentLane], 0, 0);
  car.rotation.z = 0;
  lastObstacleZ = car.position.z - 30;
  lastSceneryZ = car.position.z;

  roadSegments.forEach((seg, i) => {
    seg.position.z = -i * ROAD_SEGMENT_LENGTH;
  });

  // Hide all overlays
  document.getElementById("start-screen")!.style.display = "none";
  lobbyScreen.style.display = "none";

  gameState = "playing";

  // Notify spectator hub
  if (currentUser) {
    sendSpectatorEvent({
      type: "race_start",
      userId: currentUser.id,
      name: currentUser.name,
    });
    startSpectatorUpdates();
  }

  // AI Commentary: race start
  requestCommentary("race_start", { name: currentUser?.name || "Racer" });
}

async function gameOver(): Promise<void> {
  gameState = "gameover";
  triggerCrashEffect();

  const finalScore = Math.floor(score);

  // Submit score
  let rank: number | null = null;
  if (currentUser) {
    rank = await submitScore(currentUser.id, finalScore);
  }

  // Notify spectator hub
  stopSpectatorUpdates();
  sendSpectatorEvent({
    type: "race_end",
    userId: currentUser?.id || "",
    name: currentUser?.name || "",
    score: finalScore,
    rank: rank || 0,
  });

  // Send updated leaderboard to spectators
  sendSpectatorEvent({
    type: "leaderboard_update",
    entries: leaderboardData,
  });

  // AI Commentary: crash / top 10
  if (rank !== null && rank <= 10) {
    requestCommentary("top10", {
      name: currentUser?.name || "Racer",
      score: finalScore,
      rank,
    });
  } else {
    requestCommentary("crash", {
      name: currentUser?.name || "Racer",
      score: finalScore,
      rank: rank || 0,
    });
  }

  // Show lobby with crash results after a brief delay for the crash effect
  setTimeout(() => {
    showLobby(finalScore, rank);
  }, 1200);
}

// ─── HUD UPDATE ──────────────────────────────────────────────
const flashOverlay = document.getElementById("crash-flash")!;

function updateHUD(): void {
  document.getElementById("score-display")!.textContent = String(
    Math.floor(score)
  );
  document.getElementById("speed-display")!.textContent = `${Math.floor(
    speed * 3.6
  )} km/h`;
}

// ─── SPEED LINE UPDATE ───────────────────────────────────────
function updateSpeedLines(dt: number): void {
  const speedRatio = Math.max(0, (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED));
  speedLineMat.opacity = speedRatio * 0.6;

  const pos = speedLineGeo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < SPEED_LINE_COUNT; i++) {
    let z = pos.getZ(i) + speed * dt * speedLineVelocities[i];
    // Recycle lines that pass behind the car
    if (z > car.position.z + 20) {
      z = car.position.z - 40 - Math.random() * 40;
      pos.setX(i, car.position.x + (Math.random() - 0.5) * 25);
      pos.setY(i, Math.random() * 3 + 0.5);
    }
    pos.setZ(i, z);
  }
  pos.needsUpdate = true;
}

// ─── GAME LOOP ───────────────────────────────────────────────
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  gameTime += dt;

  handleInput();
  handleGamepad();

  // Update crash particles even when not playing
  updateCrashParticles(dt);

  // Crash flash fade
  if (crashFlashAlpha > 0) {
    crashFlashAlpha = Math.max(0, crashFlashAlpha - dt * 3);
    flashOverlay.style.opacity = String(crashFlashAlpha);
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

    // Car tilt when switching lanes
    const tiltTarget = (targetX - car.position.x) * 0.15;
    car.rotation.z += (tiltTarget - car.rotation.z) * 5 * dt;

    // Slight car bob
    car.position.y = Math.sin(gameTime * 8) * 0.015;

    // Spawn / despawn
    spawnObstacles();
    despawnObstacles();
    spawnScenery();

    // Recycle road segments
    roadSegments.forEach((seg) => {
      if (seg.position.z > car.position.z + ROAD_SEGMENT_LENGTH) {
        seg.position.z -= ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH;
      }
    });

    // Collision
    if (checkCollision()) {
      gameOver();
    }

    // AI Commentary: speed milestones (every 50 km/h)
    const currentKmh = Math.floor(speed * 3.6);
    const speedMilestone = Math.floor(currentKmh / 50) * 50;
    if (speedMilestone > lastSpeedMilestone && speedMilestone >= 100) {
      lastSpeedMilestone = speedMilestone;
      requestCommentary("speed_milestone", { speed: speedMilestone });
    }

    // AI Commentary: distance milestones (every 500)
    const distMilestone = Math.floor(distanceTraveled / 500) * 500;
    if (distMilestone > lastDistanceMilestone && distMilestone >= 500) {
      lastDistanceMilestone = distMilestone;
      requestCommentary("distance_milestone", { distance: distMilestone });
    }

    // Speed lines
    updateSpeedLines(dt);

    // Move underglow with car
    underGlow.position.set(car.position.x, 0.3, car.position.z);

    // Dynamic FOV based on speed
    const speedRatio = (speed - INITIAL_SPEED) / (MAX_SPEED - INITIAL_SPEED);
    camera.fov = 60 + speedRatio * 15;
    camera.updateProjectionMatrix();

    // Camera follow with shake
    const baseZ = car.position.z + 8;
    const baseX = car.position.x * 0.3;
    const shakeX = shakeIntensity * (Math.random() - 0.5) * 2;
    const shakeY = shakeIntensity * (Math.random() - 0.5) * 1;

    camera.position.z = baseZ + shakeY * 0.5;
    camera.position.x += (baseX - camera.position.x) * 3 * dt + shakeX;
    camera.position.y = 6 + shakeY;
    camera.lookAt(
      car.position.x * 0.2 + shakeX * 0.3,
      1,
      car.position.z - 15
    );

    // Decay shake
    shakeIntensity *= shakeDecay;
    if (shakeIntensity < 0.001) shakeIntensity = 0;

    // Move directional light with car
    dirLight.position.z = car.position.z - 5;
    dirLight.target.position.z = car.position.z - 10;
    dirLight.target.updateMatrixWorld();

    // Move starfield with camera so it always surrounds
    starfield.position.z = car.position.z;

    updateHUD();
  }

  renderer.render(scene, camera);
}

animate();

// ─── RESIZE ──────────────────────────────────────────────────
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
