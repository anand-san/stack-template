import js from "@eslint/js";
import globals from "globals";
import typescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

const baseConfig = {
  ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parser: typescriptParser,
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
    globals: {
      ...globals.browser,
      ...globals.es2021,
      ...globals.node,
    },
  },
  linterOptions: {
    reportUnusedDisableDirectives: true,
  },
  plugins: {
    "@typescript-eslint": typescript,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...typescript.configs["recommended"].rules,
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "warn",
  },
};

// Combine base config with prettier
export default {
  ...baseConfig,
  ...prettier,
};
