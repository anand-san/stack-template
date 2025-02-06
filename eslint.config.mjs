import frontendConfig from "./frontend/eslint.config.mjs";
import serverConfig from "./server/eslint.config.mjs";

export default [
  {
    files: ["frontend/src/**/*.{ts,tsx}"],
    ...frontendConfig,
  },
  {
    files: ["server/**/*.ts"],
    ...serverConfig,
  },
];
