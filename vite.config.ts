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

// Date-based version as in markusrt/NRZMyk: 1.<minor>.<yyMM>.<ddHH>, taken
// in UTC at build time. Each part is a number, so leading zeros drop
// (5 Nov 2025, 07:00 UTC -> 1.0.2511.507), as .NET's Version prints it.
function appVersion(now: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  const yyMM = Number(
    two(now.getUTCFullYear() % 100) + two(now.getUTCMonth() + 1),
  );
  const ddHH = Number(two(now.getUTCDate()) + two(now.getUTCHours()));
  return `1.0.${yyMM}.${ddHH}`;
}

export default defineConfig({
  plugins: [react(), cspPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion(new Date())),
  },
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
