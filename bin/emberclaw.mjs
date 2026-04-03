#!/usr/bin/env node
/**
 * EmberClaw entrypoint: delegates to the claw-code-parity Rust binary (claw)
 * and adds worktree / commit-push helpers.
 *
 * Binary resolution (first match):
 *   EMBERCLAW_CLAW_BIN or CLAW_BIN — explicit path
 *   <repo>/claw-engine/claw-code-parity/rust/target/release/claw
 *   <repo>/claw-engine/claw-code-parity/rust/target/debug/claw
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function printHelp() {
  process.stdout.write(`emberclaw — EmberClaw CLI (coding engine: claw-code-parity)

Usage:
  emberclaw [claw flags and args...]     start REPL or run claw (default: interactive REPL)
  emberclaw worktree <subcommand> ...   git worktree helpers (list | add | remove)
  emberclaw commit-push [options]       git add -A, commit, optional push
  emberclaw engine-path                 print resolved claw binary path (or error)
  emberclaw help                        this text

Environment:
  EMBERCLAW_CLAW_BIN / CLAW_BIN         path to claw executable (overrides auto-detect)
  GITHUB_TOKEN / GH_TOKEN               optional HTTPS push (see commit-push --help)

Run claw's own help:
  emberclaw --help
  emberclaw -h

Build the engine (from repo root):
  npm run build:engine
`);
}

function resolveClawBinary() {
  const fromEnv =
    process.env.EMBERCLAW_CLAW_BIN?.trim() || process.env.CLAW_BIN?.trim();
  if (fromEnv) {
    if (!fs.existsSync(fromEnv)) {
      throw new Error(
        `EMBERCLAW_CLAW_BIN/CLAW_BIN points to missing file: ${fromEnv}`,
      );
    }
    return path.resolve(fromEnv);
  }
  const release = path.join(
    REPO_ROOT,
    "claw-engine/claw-code-parity/rust/target/release/claw",
  );
  const debug = path.join(
    REPO_ROOT,
    "claw-engine/claw-code-parity/rust/target/debug/claw",
  );
  if (fs.existsSync(release)) return release;
  if (fs.existsSync(debug)) return debug;
  throw new Error(
    `claw binary not found. Build with:\n  cd ${path.join(REPO_ROOT, "claw-engine/claw-code-parity/rust")} && cargo build --release -p rusty-claude-cli\nOr set EMBERCLAW_CLAW_BIN to the claw executable.`,
  );
}

function runGit(args, { inherit = true } = {}) {
  const r = spawnSync("git", args, {
    stdio: inherit ? "inherit" : "pipe",
    encoding: "utf8",
    cwd: process.cwd(),
  });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function cmdWorktree(argv) {
  const sub = argv[0];
  if (!sub || sub === "--help" || sub === "-h") {
    process.stdout.write(`Usage:
  emberclaw worktree list
  emberclaw worktree add <path> [<branch>]
  emberclaw worktree remove <path> [-f]

Runs git worktree in the current directory (must be inside a git repo).
`);
    return;
  }
  if (sub === "list") {
    runGit(["worktree", "list", ...argv.slice(1)]);
    return;
  }
  if (sub === "add") {
    const rest = argv.slice(1);
    if (rest.length < 1) {
      console.error("emberclaw worktree add: missing <path> [<branch>]");
      process.exit(1);
    }
    runGit(["worktree", "add", ...rest]);
    return;
  }
  if (sub === "remove") {
    const rest = argv.slice(1);
    if (rest.length < 1) {
      console.error("emberclaw worktree remove: missing <path>");
      process.exit(1);
    }
    runGit(["worktree", "remove", ...rest]);
    return;
  }
  console.error(`Unknown worktree subcommand: ${sub}`);
  process.exit(1);
}

function injectTokenIntoRemoteUrl(url, token) {
  try {
    const u = new URL(url);
    if (u.hostname !== "github.com" || !token) return url;
    u.username = "x-access-token";
    u.password = token;
    return u.toString();
  } catch {
    return url;
  }
}

function cmdCommitPush(argv) {
  let message = "chore: emberclaw commit-push";
  let doPush = false;
  let useToken = false;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--message" || a === "-m") {
      message = argv[++i] ?? "";
      if (!message) {
        console.error("commit-push: empty --message");
        process.exit(1);
      }
    } else if (a === "--push") doPush = true;
    else if (a === "--use-github-token") useToken = true;
    else if (a === "--help" || a === "-h") {
      process.stdout.write(`emberclaw commit-push

Stages all changes, commits, optionally pushes.

Options:
  -m, --message <text>   commit message (default: chore: emberclaw commit-push)
  --push                 run git push after commit
  --use-github-token     for https://github.com/ remotes, embed GITHUB_TOKEN or GH_TOKEN in push URL (avoid logging; prefer SSH or gh auth)

Environment:
  GITHUB_TOKEN or GH_TOKEN   used only with --use-github-token
`);
      return;
    } else positional.push(a);
  }
  if (positional.length) {
    console.error("commit-push: unexpected arguments:", positional.join(" "));
    process.exit(1);
  }

  runGit(["add", "-A"]);
  const st = spawnSync("git", ["diff", "--cached", "--quiet"], {
    cwd: process.cwd(),
  });
  if (st.status === 0) {
    console.log("Nothing to commit (clean index after add).");
    if (!doPush) return;
  } else {
    runGit(["commit", "-m", message]);
  }

  if (!doPush) return;

  const remote = spawnSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  if (remote.status !== 0) {
    console.error("git push: no origin remote or get-url failed");
    process.exit(remote.status ?? 1);
  }
  let pushUrl = remote.stdout.trim();
  if (useToken) {
    const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
    if (!token) {
      console.error("--use-github-token requires GITHUB_TOKEN or GH_TOKEN");
      process.exit(1);
    }
    const injected = injectTokenIntoRemoteUrl(pushUrl, token);
    if (injected !== pushUrl) {
      const br = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
        encoding: "utf8",
        cwd: process.cwd(),
      });
      const branch = br.stdout?.trim() ?? "";
      if (!branch || branch === "HEAD") {
        console.error("commit-push: detached HEAD; checkout a branch before push");
        process.exit(1);
      }
      runGit(["push", injected, `HEAD:refs/heads/${branch}`]);
      return;
    }
    console.warn(
      "commit-push: --use-github-token only augments https://github.com/ URLs; using plain git push",
    );
  }
  runGit(["push"]);
}

function runClaw(clawPath, args) {
  const r = spawnSync(clawPath, args, { stdio: "inherit", cwd: process.cwd() });
  if (r.error) throw r.error;
  process.exit(r.status ?? 0);
}

function main() {
  const argv = process.argv.slice(2);

  if (argv[0] === "help") {
    printHelp();
    return;
  }

  if (argv[0] === "engine-path") {
    try {
      console.log(resolveClawBinary());
    } catch (e) {
      console.error(String(e.message || e));
      process.exit(1);
    }
    return;
  }

  if (argv[0] === "worktree") {
    cmdWorktree(argv.slice(1));
    return;
  }

  if (argv[0] === "commit-push") {
    cmdCommitPush(argv.slice(1));
    return;
  }

  let clawPath;
  try {
    clawPath = resolveClawBinary();
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }

  runClaw(clawPath, argv);
}

main();
