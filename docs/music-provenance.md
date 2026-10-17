# Music provenance

## Orbital Relay

Original instrumental composition and synthesis authored for Vector Duel / Pong, copyright 2026 Nathan Burns, MIT (same as code). No imported recordings, samples, collision sounds, button sounds, or other SFX. The complete score and synthesis are in `src/music.js`.

F minor, 112 BPM, eight 4/4 bars (32 beats), looping at 17.142857 seconds. Swung eighths use a 58% offbeat. The clipped motif begins F4–rest–C5–Ab4–rest–Bb4–Eb5–C5, answered F4–rest–Ab4–C5–Bb4–rest–Ab4–Eb4. Bar 6 adds an octave variation. A pulse-shaped harmonic bass, low metrical sine pulses, high pitched short bell figures, and slow airy chord envelopes form the rhythmic bed. Harmony evolves through Fm(add9)/Fm7, Dbmaj7, Ab(add9), and Eb6 colors. The D major / 142 BPM puzzle assignment and A minor / 156 BPM Breakout assignment are explicitly not used.

The deterministic score renders once into a mono PCM loop at 22050 Hz. Circular accumulation wraps long chord tails, so the loop does not repeatedly cut them off. A single Web Audio BufferSource loops for the page lifetime, connected through a smoothly automated master gain and analyser. This avoids timer scheduling drift, duplicate notes, and stale queued events. Game pause/restart/over and resize do not touch the transport. Muting changes gain rather than stopping it. Background visibility can suspend the context; resuming continues the same context time/phase. Only a real interaction constructs/unlocks audio. Volume and enabled preference live under `vector-duel.music`.

## Read-only comparison

All four complete supplied music sources were read before composing. Source hashes (SHA-256):

| Source | SHA-256 |
| --- | --- |
| neon_snake.js | `a70cc55080a5ddf9a21bf68f32349edc53bdedd0e39423778cec8edfe978eb78` |
| tetris_game.js | `a150482a1da1b062222f62eb964752864a0240cf296fa19c9baa5ac249a04aa5` |
| pang_game.js | `9b65c132e7675438674582a1899396a341d547732688a676a720f0ea49aeb94f` |
| flappy_bird_game.js | `c931ee96859eb58849d76fac0423eed28ad6bb6b002dece7fd90c8ac59cac592` |

- Neon Snake / Neon Circuit: 8-second straight 0.25-second grid, G/A-related bass frequencies and a C/E/G lead contour, saw/square layers and regular sine kick. Orbital Relay uses a slower swung grid, F-minor pentatonic motif with rests, eight-bar harmony and circular airy tails instead.
- Tetris / Neon Stack: 150 BPM straight sixteenths, E-oriented melody MIDI 76,79,83,79 and bass 40,40,47,40; square lead with seeded noise hats. Orbital Relay is not that fast even-step tune, has no noise source, and uses a different melody, key, harmony, phrase and rhythm.
- Pang / Polar Circuit: 172 BPM, E-centered 64-step line E4–G4–A4–B4, square melody and triangle bass plus bright percussion tones. Orbital Relay uses F minor at 112 BPM and a spaced descending/answering motif rather than a running E-minor line.
- Flappy Bird / Skyline Skip: 148 BPM C-major straight eighths, opening C5–E5–G5–E5, bass C3/F3/A2/G3 and occasional octave echoes. Orbital Relay uses a minor, syncopated rest-bearing melody, swung bass and changing sustained chord voicings, not the C-major arpeggio.

These are source-level note/rhythm/arrangement comparisons, not an exhaustive plagiarism detector or a claim of uniqueness against all existing music. No existing game files were modified. Synthesis techniques (oscillators, envelopes and MIDI-to-Hz conversion) are standard.

## Audio verification limits

Vitest checks score metadata, samples, RMS, peak, seam delta, storage failures, single initialization, loop and preference continuity. Real-browser OfflineAudioContext tests render the actual composition through the default master gain and assert RMS/headroom/seam. Real-browser analyser tests verify audible signal, gain-muted near-silence, and restored signal; UI tests check identical transport origin/source/context count across gameplay, pause/restart, resize, mute and volume. Numeric results are attached to Playwright reports and summarized in verification evidence. Headless Linux tests use an isolated PulseAudio null sink so Firefox has a real audio clock; Web Audio and analyser output are real, while physical output is discarded. No physical phone, speaker output, headphone comfort or subjective loudness is claimed verified.
