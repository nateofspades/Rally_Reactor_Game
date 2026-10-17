# Collection-level music mastering

A full-PCM comparison found the original Pong default was about 7 dB below Capsule Lab and 6 dB below Breakout. The final master gain is 1.4 rather than 0.65; the default player volume remains 65%, and saved user preferences remain unchanged. The same constant is used at initialization and every mute/unmute or volume update. No extra audio layer, limiter, compression, sound effect or transport reset was introduced.

At 24 kHz synthesis, final default full-loop RMS is 0.0465874 and peak is 0.233882. Full-volume peak is 0.359819, retaining substantial digital headroom. Capsule Lab and Breakout defaults measured approximately 0.0480 and 0.0419 RMS respectively; this places all three within about 1.2 dB in unweighted electrical RMS. Timbre and speaker response still affect perceived loudness.

A new regression test first failed at RMS 0.0216395, then passed at the matched level. The complete Vitest suite has 15 tests. Browser OfflineAudioContext coverage imports the actual master constant, enforces default RMS 0.04–0.06 and peak below 0.85, and retains real analyser mute/unmute and uninterrupted-transport checks in Chromium, Firefox and WebKit. GitHub Actions runs the complete browser suite for every pushed change.

These are measured digital signal levels, not listening tests on physical desktop or smartphone speakers. Device-level volume and browser audio policies remain respected.
