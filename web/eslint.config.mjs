import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node.js scripts using CommonJS require() — not part of the Next.js app
    "cluster.js",
    "scripts/**",
  ]),
  {
    rules: {
      // Downgrade to warn: these patterns (isMounted guard, localStorage hydration,
      // DOM reads on navigation) are intentional — not bugs the rule was designed to catch.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
