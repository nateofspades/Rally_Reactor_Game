# Verification

## Rally Reactor final-release execution — 2026-10-20

Owner-authorized final release supersedes private holds. Fresh execution evidence is `/root/arcade-final-migration/rallyreactorgame/`, separate from the historical evidence below.

- Full single-worker Vitest: 16 passed across 6 files, 0 failed, 0 skipped.
- Full single-worker Playwright: 87 enumerated cases, **80 passed, 7 skipped, 0 failed, 0 flaky**. Chromium 29 passed / 0 skipped; Firefox 23 passed / 6 skipped; WebKit 28 passed / 1 skipped. Raw JSON and exact audio values are in `browser-final.json` and `browser-summary.json` in release evidence.
- All six exact viewport geometries passed in each engine: 1920×1080, 1366×768, 768×1024, 390×844, 320×568, 844×390. Initial fit plus active native-context play passed at all six in Chromium/WebKit; Firefox passed both desktop startup cases and all six desktop-context geometries. Firefox's four mobile-context cases, existing mobile-context case and Chromium-only CDP case are explicitly skipped; WebKit skips only CDP.
- Real clock/transport continuity, actual node counts, offline signal/headroom/seam and live analyser mute/unmute passed in every engine using the isolated Linux null sink. Offline RMS 0.046588341155208886, peak 0.2336840182542801, seam delta 0.00029393122531473637. Live muted RMS: Chromium 0, Firefox 3.6814603359329635e-9, WebKit 0. These are digital measurements, not subjective or physical output acceptance.
- Fresh exact-title regression was observed RED on the old browser title before the targeted identity edit. Seeded origin-wide records/preferences survived the retired-path to final-path test in all three engines; only the retired document is fulfilled locally, not the storage implementation. No real-user migration is claimed.
- An initial browser run exposed an overly short 5-second playing-state readiness deadline at 1920×1080 on this software-rendering VPS. It was stopped, its trace/log retained, and the test-only deadline extended to 30 seconds. The full clean rerun above passed; game countdown/physics were not weakened or mocked.
- Active desktop/portrait/landscape screenshots were freshly captured after real Start and playing-state readiness, then actually viewed. The README image is not a countdown or mockup.
- Full and production-only npm registry audits reported zero vulnerabilities. No production npm dependencies, audio notes, physics, input behavior or storage keys changed in the release rebrand.

The release evidence report records the actual supported Codex review result/reviewed head, immutable-ID rename readback, final remote author association, exact-SHA CI/Pages runs and deployed checks. Remote success is never inferred from local tests. Browser emulation is not physical-device, speaker/headphone loudness, mobile interruption or sustained-FPS acceptance. IP assessment is technical due diligence, not legal clearance.

## Historical pre-migration execution (not fresh final counts)

Run began 2026-10-17T03:25:39.193Z. Node 22.23.3, npm 12.2.0, Vitest 4.1.12, Playwright 1.64.1 on Linux. All workers limited to one. No mocked browser output was substituted for execution.

- `npm test`: 4 test files passed; 14 tests passed, 0 failed.
- `npm run test:browser`: 45 passed, 0 failed, 3 deliberately skipped; 48 cases across three engines. No retries/flaky passes. Full run duration: 1304.615 seconds on the loaded VPS.
- `npm audit`: 0 vulnerabilities after upgrading the initial Vitest dependency.

| Browser | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: |
| chromium | 16 | 0 | 0 |
| firefox | 14 | 0 | 2 |
| webkit | 15 | 0 | 1 |

Every engine checked the complete court and controls at 1920×1080, 1366×768, 768×1024, 390×844, 320×568 and 844×390. The six sizes are named test steps in each engine's geometry case, avoiding six redundant audio initializations. Assertions include a real painted paddle pixel, aspect ratio, full court bounds, no horizontal overflow, visible essential controls and minimum 44px control heights.

Firefox cannot emulate Playwright `isMobile`, so its touch-context test is skipped. Native CDP touch injection runs only in Chromium, and is skipped in Firefox and WebKit. Chromium and WebKit both executed actual touch-context taps; all engines executed captured pointer drags and keyboard controls. Chromium also executed native touch drag beyond the court bounds. These are browser emulations, not physical phone tests.

## Coverage

Rules: movement timing, paddle limits, top/bottom walls, inclusive paddle-edge contact, substeps/no tunneling, front-face direction, bounce-angle bounds, rally speed cap, one-point scoring, reset/countdown/serve, match at ten, AI reaction/speed/error and distinct difficulties, pause, restart and retained records.

Storage/audio abstraction: denied or malformed storage, score/rally records, volume limits, preferences, one context/looping source/start, mute/unmute and visibility continuity. Browser flows: real startup, both keyboard players, pointer capture, touch mapping, pause/resume, restart, victory and Game Over with final score, persistence after reload, resizing/orientation and visibility auto-pause without auto-resume. A gated localhost scenario hook is used only after real interaction for deterministic end-state tests.

Initial audio measurements, before collection-level mastering: actual OfflineAudioContext renders in Chromium, Firefox and WebKit measured RMS 0.021630301, peak 0.108496152, and seam delta 0.000136468 at the then-default gain/volume. See [collection mastering](mastering.md) for the final, louder matched level. Real live analyser samples verified audible signal, near-zero muted signal, and restored signal. A browser wrapper counted actual AudioContext, BufferSource and oscillator creation during UI transitions: one context, one source, zero event/SFX oscillators. Detailed measured values are in [audio-metrics.json](audio-metrics.json).

## Bugs found and fixed

- Fast touch taps could end before a physics frame consumed the target. Pointerdown now maps immediately; scaled-court and rail tests cover the fix.
- Compact desktop/landscape music controls fell below the viewport, and a landscape volume row overflowed. The complete landscape court now shares space with a sidebar console/music panel; all six geometries pass.
- Slider Home/End keyboard support was missing; it is now tested and implemented.
- Two-player rail copy could imply touch play. It now explicitly says keyboard only.
- WebKit could swallow Pause clicks when an identical text node was replaced during a serve transition. A deterministic down/transition/up test failed before conditional text assignment and passes in all engines afterward.
- Codex found released movement keys leaking across replay and an unrelated pointer release canceling the active drag (two P2 findings). Both were reproduced with failing tests, fixed, and passed on all engines.
- A further regression test confirmed that court interaction failed to restore keyboard focus after volume input. Explicit control focus fixes it.
- Firefox's live audio clock was suspended without an output device on the headless VPS. The test runner now starts/cleans up its own private PulseAudio null sink; production audio code was not weakened or replaced.
- WebKit native touch coordinates are CSS-pixel quantized; coordinate assertions allow at most one CSS pixel transformed into logical court units, not a fixed half-logical-unit tolerance.

## Review and evidence

Actual `codex login status` confirmed ChatGPT authentication. Supported `codex review --uncommitted` completed in a read-only sandbox using gpt-6.1-sol. The initial review identified two P2 input bugs; the follow-up completed with no actionable correctness issues after fixes. Full output is preserved outside the repository at `/root/arcade-projects/delivery/pong_game-codex-review.log`.

Actual unit/browser stdout and complete Playwright JSON are preserved alongside the delivery report. The initial failing run, a WebKit Pause failure trace, and red review-regression evidence are retained. Active local gameplay screenshots were captured and visually inspected; [desktop](../assets/screenshots/gameplay.png), [portrait](../assets/screenshots/mobile.png) and [landscape](../assets/screenshots/landscape.png) are original captures, not mockups.

## Deployment and limits

CI independently repeats `npm ci`, unit tests, browser installation and all browser tests on the exact pushed HEAD. The external delivery report records the observed CI run IDs/conclusions, exact remote SHA/author association, Pages source/build status, public screenshot response and live Playwright checks. These remote outcomes are not inferred from local tests.

Physical-device touch, speaker/headphone loudness, mobile hardware interruption behavior and sustained hardware FPS are not claimed verified. Target is 60 FPS; functional timing and geometry are tested, not a universal performance guarantee. Visibility is exercised through browser events, and the original music comparison is source-level rather than an exhaustive plagiarism detector.
