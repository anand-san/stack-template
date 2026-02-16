import frontendConfig from "./frontend/eslint.config.mjs";
import serverConfig from "./server/eslint.config.mjs";

export default [
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    ...frontendConfig,
  },
  {
    files: ["frontend/src/__tests__/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["server/**/*.ts"],
    ...serverConfig,
  },
];
