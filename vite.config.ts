import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

// Production pages may only talk to their own origin (FR-039, research R7).
// The dev server stays without CSP because React refresh injects inline code.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function cspPlugin(): Plugin {
  return {
    name: "kandidu-csp",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: {
          "http-equiv": "Content-Security-Policy",
          content: contentSecurityPolicy,
        },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  build: {
    // The PDF library (~570 kB) is a lazy chunk loaded only for PDF work
    // (ADR 009); warn only above that.
    chunkSizeWarningLimit: 600,
  },
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: false,
  },
});
