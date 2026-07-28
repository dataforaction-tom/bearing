import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // @napi-rs/canvas ships a native (napi-rs/Rust) binary loader —
  // js-binding.js — that Turbopack can't trace into an ESM chunk ("asset is
  // not placeable in ESM chunks"). Marking it external tells Next.js to
  // require() it directly from node_modules at runtime instead of bundling it.
  serverExternalPackages: ["@napi-rs/canvas"],
};

export default nextConfig;
