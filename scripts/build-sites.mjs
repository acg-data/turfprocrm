import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const workerPath = path.join(root, ".sites-wrangler-build", "worker.js");
const assetsPath = path.join(root, ".open-next", "assets");
const distPath = path.join(root, "dist");

await stat(workerPath);
await stat(assetsPath);

await rm(distPath, { recursive: true, force: true });
await mkdir(path.join(distPath, "server"), { recursive: true });
await mkdir(path.join(distPath, "client"), { recursive: true });
await cp(workerPath, path.join(distPath, "server", "index.js"));
await cp(assetsPath, path.join(distPath, "client"), { recursive: true });

console.log("Prepared the bundled Cloudflare Worker for Sites.");
