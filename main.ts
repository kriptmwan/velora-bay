// main.ts — Velora Bay entry program for make.fun competition gta6-01.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor/makefun-game.ts. Standard library only, no network.
// The output directory itself is never removed — the grader bind-mounts
// it, so only its CONTENTS are emptied before the fresh copy lands.

import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function emptyDirContents(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function copyTree(src: string, dest: string): void {
  fs.cpSync(src, dest, { recursive: true });
}

emptyDirContents(outDir);
copyTree(path.join(repoRoot, "game"), path.join(outDir, "game"));
copyTree(path.join(repoRoot, "screenshots"), path.join(outDir, "screenshots"));

const dossier = await buildDossier(outDir, { text_max_bytes: 163840 });
fs.writeFileSync(path.join(outDir, "dossier.json"), dossier);
console.log("Velora Bay entry written to " + outDir);
