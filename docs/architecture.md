# Architecture

The published game is static. `index.html`, `style.css`, `assets/` and `src/` are sufficient; `server.js` only serves local development files.

## Rules

`src/rules.js` is independent of Canvas, the DOM, audio and storage. It owns a 960 × 540 logical court, two 108-unit paddles, one radius-9 ball and a first-to-10 score. The renderer never controls collision decisions.

The animation loop accumulates elapsed seconds and advances at 120 Hz. Each rules advance is subdivided to no more than 1/240 second. A capped-speed ball travels at most 3.42 units per collision substep, less than its radius. Paddle collision requires an incoming ball crossing the front plane, so an outgoing or already-behind ball cannot bounce twice. Walls reflect overshoot. Paddle contact maps to a signed angle, bounded away from zero (0.14 rad) and vertical (maximum pi/3 rad). Returns gain 5.5% speed up to 820 units/second. Points reset the ball at center and serve toward the player who won the point, after 1.5 seconds. Match end freezes the final score and winner.

AI reads a new imperfect target only at its reaction interval. Easy / Medium / Hard respectively have 0.32 / 0.19 / 0.11 second reaction intervals, 210 / 300 / 390 units/second movement caps, and up to 100 / 62 / 32 units of target error. It does not predict an exact intercept or instantly snap to the ball. Tests inject deterministic randomness.

## Presentation and input

`src/app.js` maps keyboard state and pointer positions to rules inputs, handles focus/visibility, and draws logical coordinates through a DPI-aware transform. Canvas client rectangles—not backing-buffer pixels—map touch positions, preserving accuracy after scaling and orientation. Pointer capture continues drags outside their initial target; cancellation releases the input. The separate 44px horizontal rail maps left/right positions to the paddle's top/bottom travel range, keeping fingers away from the ball. Two-player mode intentionally remains keyboard-only.

Critical playfield geometry keeps a 16:9 aspect ratio. A compact landscape grid puts setup and pause/restart controls beside the complete court. Portrait layouts stack controls; compact small-phone layouts omit secondary decorative instructions to keep match/music controls visible. Game visibility loss pauses without auto-resume. Music has a separate lifecycle; game state changes never pause or reconstruct it.

## Storage and audio

`src/storage.js` safely reads/writes game-specific JSON keys. `vector-duel.record` holds longest rally and highest match score; `vector-duel.music` holds enabled/volume preferences. Storage denial or malformed JSON falls back without stopping play.

`src/music.js` contains all original score and synthesis data. It creates a single looping PCM source after a user gesture, and changes only master gain for mute and volume. There are no event sound effects or gameplay-triggered audio nodes. The public `window.vectorDuel` API returns detached state copies and frozen audio diagnostic snapshots, not mutable production state. Scenario mutation and analyser access require both a localhost hostname and an explicit `?test` query.
