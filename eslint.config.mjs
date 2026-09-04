import nextConfig from "eslint-config-next/core-web-vitals";

const openHubEslintConfig = [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "convex/_generated/**",
      "openhub-a-developer-first/**",
      "next-env.d.ts",
    ],
  },
];

export default openHubEslintConfig;
