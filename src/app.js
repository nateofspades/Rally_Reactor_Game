import {
  createGame,
  start,
  pause,
  restart,
  step,
  W,
  H,
  HALF,
} from "./rules.js";
import { Music } from "./music.js";
import { load, save, browserStorage } from "./storage.js";
const $ = (id) => document.getElementById(id),
  storage = browserStorage(),
  stored = load(storage, "record", {});
const numeric = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
const game = createGame({
    longest: numeric(stored?.longest),
    record: numeric(stored?.record),
  }),
  music = new Music({ storage });
const canvas = $("court"),
  ctx = canvas.getContext("2d");
let keys = new Set(),
  target,
  activePointer = null,
  acc = 0,
  last = performance.now(),
  persisted = JSON.stringify([game.longest, game.record]);
const labels = {
  ready: "Awaiting challengers",
  countdown: "Serve incoming",
  playing: "Rally live",
  paused: "Paused",
  over: "Match complete",
};
let uiSignature = "";
function sync() {
  const signature = JSON.stringify([
    game.state,
    game.score,
    game.rally,
    game.longest,
    game.record,
    game.mode,
    game.difficulty,
    Math.ceil(game.countdown),
  ]);
  $("drag").setAttribute("aria-valuenow", Math.round(game.paddles[0]));
  if (signature === uiSignature) return;
  uiSignature = signature;
  $("scoreLeft").textContent = String(game.score[0]).padStart(2, "0");
  $("scoreRight").textContent = String(game.score[1]).padStart(2, "0");
  $("rally").textContent = game.rally;
  $("best").textContent = game.longest;
  $("record").textContent = game.record;
  $("status").textContent = labels[game.state];
  $("pause").disabled = !["playing", "countdown", "paused"].includes(
    game.state,
  );
  // Keep the text node stable during an in-flight native click (notably WebKit).
  const pauseLabel = game.state === "paused" ? "Resume" : "Pause";
  if ($("pause").textContent !== pauseLabel)
    $("pause").textContent = pauseLabel;
  $("overlay").hidden = !["ready", "paused", "over"].includes(game.state);
  $("start").firstChild.textContent =
    game.state === "paused"
      ? "Resume match "
      : game.state === "over"
        ? "Play again "
        : "Start match ";
  $("overlayTag").textContent =
    game.state === "over"
      ? "FINAL SCORE " + game.score.join(" : ")
      : game.mode === "solo"
        ? "HUMAN VS MACHINE"
        : "LOCAL KEYBOARD DUEL";
  $("overlayTitle").textContent =
    game.state === "paused"
      ? "Signal on hold."
      : game.state === "over"
        ? game.winner === 0
          ? game.mode === "solo"
            ? "Victory."
            : "Player 1 wins."
          : game.mode === "solo"
            ? "Game Over."
            : "Player 2 wins."
        : "Find your angle.";
  $("overlayCopy").textContent =
    game.state === "paused"
      ? "Take a breath. The signal keeps moving."
      : game.state === "over"
        ? "First to ten. A new duel awaits."
        : "Two paddles. One signal. Own the rally.";
  $("count").textContent =
    game.state === "countdown" ? Math.max(1, Math.ceil(game.countdown)) : "";
  $("leftLabel").textContent = game.mode === "solo" ? "YOU" : "PLAYER 1";
  $("rightLabel").textContent = game.mode === "solo" ? "COMPUTER" : "PLAYER 2";
  $("mode").disabled = game.state !== "ready" && game.state !== "over";
  $("difficulty").disabled = game.mode === "duo" || $("mode").disabled;
  $("drag").setAttribute("aria-valuenow", Math.round(game.paddles[0]));
  $("drag").setAttribute("aria-disabled", game.mode === "duo");
  $("drag").querySelector("span").textContent =
    game.mode === "duo"
      ? "TWO PLAYERS · KEYBOARD ONLY"
      : "SLIDE: LEFT = UP · RIGHT = DOWN";
  const record = JSON.stringify([game.longest, game.record]);
  if (record !== persisted) {
    persisted = record;
    save(storage, "record", { longest: game.longest, record: game.record });
  }
}
function draw() {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#07151e";
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#15303b";
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.setLineDash([8, 14]);
  ctx.strokeStyle = "#53717a";
  ctx.beginPath();
  ctx.moveTo(W / 2, 15);
  ctx.lineTo(W / 2, H - 15);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 64, 0, Math.PI * 2);
  ctx.strokeStyle = "#24424b";
  ctx.stroke();
  for (let s = 0; s < 2; s++) {
    ctx.fillStyle = s === 0 ? "#74f5d1" : "#ff997e";
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 18;
    ctx.fillRect(s === 0 ? 28 : 918, game.paddles[s] - HALF, 14, HALF * 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = s === 0 ? "#c9ffed" : "#ffdbc8";
    ctx.fillRect(s === 0 ? 38 : 918, game.paddles[s] - HALF, 4, HALF * 2);
  }
  const b = game.ball;
  ctx.shadowColor = "#c4fff4";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "#e1fff8";
  ctx.beginPath();
  ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (game.state === "playing") {
    ctx.strokeStyle = "#a5e3dd44";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
    ctx.lineTo(b.x - b.vx * 0.065, b.y - b.vy * 0.065);
    ctx.stroke();
  }
}
function resize() {
  const rect = canvas.getBoundingClientRect(),
    dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  draw();
}
new ResizeObserver(resize).observe(canvas);
function clearInputs() {
  keys.clear();
  target = undefined;
  activePointer = null;
}
function frame(now) {
  acc += Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  while (acc >= 1 / 120) {
    step(game, 1 / 120, {
      left:
        (keys.has("s") ? 1 : 0) -
        (keys.has("w") ? 1 : 0) +
        (game.mode === "solo"
          ? (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0)
          : 0),
      right: (keys.has("ArrowDown") ? 1 : 0) - (keys.has("ArrowUp") ? 1 : 0),
      target,
    });
    acc -= 1 / 120;
  }
  sync();
  draw();
  requestAnimationFrame(frame);
}
function launch() {
  clearInputs();
  void music.activate();
  if (game.state === "paused") pause(game);
  else if (game.state === "over") restart(game);
  else start(game);
  canvas.focus({ preventScroll: true });
  sync();
}
$("start").addEventListener("click", launch);
$("pause").addEventListener("click", () => {
  void music.activate();
  pause(game);
  clearInputs();
  sync();
});
$("restart").addEventListener("click", () => {
  void music.activate();
  restart(game);
  clearInputs();
  sync();
});
function setMode() {
  game.mode = $("mode").value;
  game.difficulty = $("difficulty").value;
  $("instructions").innerHTML =
    game.mode === "duo"
      ? "<kbd>W</kbd> <kbd>S</kbd> Player 1 · <kbd>↑</kbd> <kbd>↓</kbd> Player 2 · <kbd>P</kbd> pause<br>Two-player mode requires a keyboard. No dual-touch controls."
      : "<kbd>W</kbd> <kbd>S</kbd> or <kbd>↑</kbd> <kbd>↓</kbd> move · <kbd>P</kbd> pause<br>Touch: slide the rail left = up, right = down. Or drag in the court.";
  sync();
}
$("mode").addEventListener("change", setMode);
$("difficulty").addEventListener("change", setMode);
function keyboard(e, down) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // Releases always clear ownership, including final-score screens and form focus.
  if (!down) {
    keys.delete(key);
    return;
  }
  if (["INPUT", "SELECT"].includes(e.target.tagName)) return;
  if (["w", "s", "ArrowUp", "ArrowDown", "p"].includes(key)) {
    if (game.state === "ready" || game.state === "over") return;
    e.preventDefault();
    void music.activate();
    if (key === "p" && !e.repeat) {
      pause(game);
      clearInputs();
      sync();
    } else if (key !== "p") {
      target = undefined;
      keys.add(key);
    }
  }
}
window.addEventListener("keydown", (e) => keyboard(e, true));
window.addEventListener("keyup", (e) => keyboard(e, false));
window.addEventListener("blur", () => {
  clearInputs();
  if (["playing", "countdown"].includes(game.state)) pause(game);
  sync();
});
function pointer(e, rail) {
  if (game.mode !== "solo" || !["playing", "countdown"].includes(game.state))
    return;
  const el = e.currentTarget;
  if (e.type === "pointerdown") {
    if (activePointer !== null) return;
    activePointer = e.pointerId;
    el.setPointerCapture(e.pointerId);
    el.focus({ preventScroll: true });
    void music.activate();
  }
  if (e.pointerId !== activePointer) return;
  e.preventDefault();
  const r = el.getBoundingClientRect();
  target = rail
    ? 54 + ((e.clientX - r.left) / r.width) * (H - 108)
    : ((e.clientY - r.top) / r.height) * H;
  game.paddles[0] = Math.max(HALF, Math.min(H - HALF, target));
}
for (const [el, rail] of [
  [canvas, false],
  [$("drag"), true],
]) {
  el.addEventListener("pointerdown", (e) => pointer(e, rail));
  el.addEventListener("pointermove", (e) => pointer(e, rail));
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    el.addEventListener(event, (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      target = undefined;
    });
}
$("drag").addEventListener("keydown", (e) => {
  if (game.mode !== "solo" || !["playing", "countdown"].includes(game.state))
    return;
  if (!["Home", "End", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
  e.preventDefault();
  e.stopPropagation();
  target = undefined;
  const next =
    e.key === "Home"
      ? HALF
      : e.key === "End"
        ? H - HALF
        : game.paddles[0] + (e.key === "ArrowRight" ? 24 : -24);
  game.paddles[0] = Math.max(HALF, Math.min(H - HALF, next));
  void music.activate();
  sync();
});
$("music").addEventListener("click", () => {
  music.setEnabled(!music.enabled);
  void music.activate();
  audioUI();
});
$("volume").addEventListener("input", () => {
  music.setVolume(Number($("volume").value));
  void music.activate();
  audioUI();
});
function audioUI() {
  $("music").textContent = music.enabled ? "Music On" : "Music Off";
  $("music").setAttribute("aria-pressed", String(music.enabled));
  $("volume").value = music.volume;
}
document.addEventListener("visibilitychange", () => {
  clearInputs();
  if (document.hidden && ["playing", "countdown"].includes(game.state))
    pause(game);
  void music.visibility(document.hidden);
  last = performance.now();
  acc = 0;
  sync();
});
window.vectorDuel = Object.freeze({
  audio: () => music.snapshot(),
  state: () => structuredClone(game),
});
if (
  ["localhost", "127.0.0.1"].includes(location.hostname) &&
  new URLSearchParams(location.search).has("test")
) {
  window.__test = Object.freeze({
    scenario(patch) {
      Object.assign(game, patch);
      sync();
      draw();
    },
    advance(dt) {
      step(game, dt, {});
      sync();
      draw();
    },
    analyser: () => music.analyser,
  });
}
audioUI();
sync();
resize();
requestAnimationFrame(frame);
