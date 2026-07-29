import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // @napi-rs/canvas ships a native (napi-rs/Rust) binary loader —
  // js-binding.js — that Turbopack can't trace into an ESM chunk ("asset is
  // not placeable in ESM chunks"). pdf-parse (via pdfjs-dist) resolves its
  // worker script from a path relative to its own bundled file at runtime
  // ("./pdf.worker.mjs"); when Turbopack bundles pdf-parse into a single
  // chunk, that sibling file never ships with it, producing "Cannot find
  // module '.../pdf.worker.mjs'" in production. Marking both external tells
  // Next.js to require() them directly from node_modules at runtime instead
  // of bundling them, so each package's own file layout (and its worker
  // file) stays intact.
  serverExternalPackages: ["@napi-rs/canvas", "pdf-parse"],
};

export default nextConfig;
