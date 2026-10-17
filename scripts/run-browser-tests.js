// Linux headless Firefox needs an audio device. Use our own null sink, not a
// shared user daemon. This is real Web Audio; only physical output is discarded.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
let pulse, child, directory;
let pulseError = "";
const stop = () => {
  child?.kill("SIGTERM");
  pulse?.kill("SIGTERM");
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
try {
  const env = { ...process.env };
  if (process.platform === "linux" && !env.PULSE_SERVER) {
    mkdirSync(".runtime", { recursive: true });
    directory = mkdtempSync(resolve(".runtime/audio-"));
    const socket = resolve(directory, "pulse.sock");
    pulse = spawn(
      "pulseaudio",
      [
        "-n",
        "--daemonize=no",
        "--exit-idle-time=-1",
        "--use-pid-file=no",
        `--load=module-native-protocol-unix socket=${socket} auth-anonymous=1`,
        "--load=module-null-sink sink_name=pong_browser_tests",
      ],
      {
        env: { ...env, PULSE_RUNTIME_PATH: directory },
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    pulse.stderr.on("data", (d) => {
      pulseError += d;
    });
    pulse.on("error", (e) => {
      pulseError = e.message;
    });
    const until = Date.now() + 15000;
    while (
      !existsSync(socket) &&
      Date.now() < until &&
      pulse.exitCode === null &&
      !pulseError.includes("ENOENT")
    )
      await delay(50);
    if (!existsSync(socket))
      throw Error(
        "Isolated audio sink failed. Install pulseaudio on Linux. " +
          pulseError,
      );
    env.PULSE_SERVER = "unix:" + socket;
  }
  child = spawn(
    process.execPath,
    [
      resolve("node_modules/@playwright/test/cli.js"),
      "test",
      "--workers=1",
      ...process.argv.slice(2),
    ],
    { env, stdio: "inherit" },
  );
  process.exitCode = await new Promise((ok, no) => {
    child.once("error", no);
    child.once("exit", (code) => ok(code ?? 1));
  });
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  stop();
  if (pulse && pulse.exitCode === null)
    await Promise.race([
      new Promise((r) => pulse.once("exit", r)),
      delay(3000),
    ]);
  if (directory) rmSync(directory, { recursive: true, force: true });
}
