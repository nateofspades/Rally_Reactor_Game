export const W = 960,
  H = 540,
  HALF = 54,
  R = 9;
export const AI = {
  easy: { interval: 0.32, speed: 210, error: 100 },
  medium: { interval: 0.19, speed: 300, error: 62 },
  hard: { interval: 0.11, speed: 390, error: 32 },
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createGame(options = {}) {
  return {
    mode: options.mode || "solo",
    difficulty: options.difficulty || "medium",
    state: "ready",
    paddles: [270, 270],
    ball: { x: 480, y: 270, vx: 0, vy: 0 },
    score: [0, 0],
    rally: 0,
    longest: options.longest || 0,
    record: options.record || 0,
    countdown: 1.5,
    serve: 1,
    aiClock: 0,
    aiTarget: 270,
    winner: null,
  };
}
export function start(g) {
  if (g.state === "ready") {
    g.state = "countdown";
  }
}
export function pause(g) {
  if (g.state === "paused") {
    g.state = g.previous;
  } else if (["playing", "countdown"].includes(g.state)) {
    g.previous = g.state;
    g.state = "paused";
  }
}
export function restart(g) {
  const fresh = createGame(g);
  Object.assign(g, fresh);
  start(g);
}
export function bounce(g, side, contact) {
  let angle = (clamp(contact, -1, 1) * Math.PI) / 3;
  if (Math.abs(angle) < 0.14) angle = (angle < 0 ? -1 : 1) * 0.14;
  const speed = Math.min(820, Math.hypot(g.ball.vx, g.ball.vy) * 1.055);
  g.ball.vx = (side === 0 ? 1 : -1) * speed * Math.cos(angle);
  g.ball.vy = speed * Math.sin(angle);
  g.rally++;
  g.longest = Math.max(g.longest, g.rally);
}
function point(g, who) {
  g.score[who]++;
  g.record = Math.max(g.record, ...g.score);
  g.rally = 0;
  g.ball = { x: 480, y: 270, vx: 0, vy: 0 };
  g.serve = who === 0 ? -1 : 1;
  g.countdown = 1.5;
  if (g.score[who] >= 10) {
    g.state = "over";
    g.winner = who;
  } else g.state = "countdown";
}
export function step(g, dt, input = {}, random = Math.random) {
  if (
    !["playing", "countdown"].includes(g.state) ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return;
  const n = Math.ceil(dt / (1 / 240)),
    h = dt / n;
  for (let i = 0; i < n; i++) {
    g.paddles[0] = clamp(
      input.target !== undefined
        ? input.target
        : g.paddles[0] + (input.left || 0) * 470 * h,
      HALF,
      H - HALF,
    );
    if (g.mode === "duo")
      g.paddles[1] = clamp(
        g.paddles[1] + (input.right || 0) * 470 * h,
        HALF,
        H - HALF,
      );
    else {
      const a = AI[g.difficulty] || AI.medium;
      g.aiClock -= h;
      if (g.aiClock <= 0) {
        g.aiClock = a.interval;
        g.aiTarget =
          g.ball.vx > 0 ? g.ball.y + (random() * 2 - 1) * a.error : H / 2;
      }
      g.paddles[1] = clamp(
        g.paddles[1] +
          clamp(g.aiTarget - g.paddles[1], -a.speed * h, a.speed * h),
        HALF,
        H - HALF,
      );
    }
    if (g.state === "countdown") {
      g.countdown -= h;
      if (g.countdown <= 0) {
        g.state = "playing";
        g.ball.vx = 360 * g.serve;
        g.ball.vy = 110 * g.serve;
      }
      continue;
    }
    const b = g.ball,
      old = b.x;
    b.x += b.vx * h;
    b.y += b.vy * h;
    if (b.y < R) {
      b.y = 2 * R - b.y;
      b.vy = Math.abs(b.vy);
    }
    if (b.y > H - R) {
      b.y = 2 * (H - R) - b.y;
      b.vy = -Math.abs(b.vy);
    }
    for (let s = 0; s < 2; s++) {
      const plane = s === 0 ? 49 : 911;
      if (
        (s === 0
          ? b.vx < 0 && old >= plane && b.x <= plane
          : b.vx > 0 && old <= plane && b.x >= plane) &&
        Math.abs(b.y - g.paddles[s]) <= HALF + R
      ) {
        b.x = plane;
        bounce(g, s, (b.y - g.paddles[s]) / HALF);
      }
    }
    if (b.x < -R) {
      point(g, 1);
      break;
    }
    if (b.x > W + R) {
      point(g, 0);
      break;
    }
  }
}
