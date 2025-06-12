import { build } from "estrella";

export async function buildAll(
  { isNodeMode }: { isNodeMode: boolean } = { isNodeMode: false }
) {
  return Promise.all([
    build({
      entryPoints: ["./src/index.ts"],
      bundle: true,
      outfile: "./dist/index.js",
      platform: isNodeMode ? "node" : undefined,
      format: "cjs",
    }),
    build({
      entryPoints: ["./src/index.ts"],
      bundle: true,
      outfile: "./dist/index.js",
      platform: isNodeMode ? "node" : undefined,
      format: "esm",
    }),
    build({
      entryPoints: ["./src/bin.ts"],
      bundle: true,
      outfile: "./dist/bin.js",
      platform: isNodeMode ? "node" : undefined,
      format: "cjs",
    }),
  ]);
}
