import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: ["test-results/**", "playwright-report/**", ".next/**", "node_modules/**"],
  },
  ...nextVitals,
];

export default config;
