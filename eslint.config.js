import js from "@eslint/js";
import globals from "globals";
import eslintReact from "@eslint-react/eslint-plugin";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  // Global ignore rules
  {
    ignores: ["dist/**", "coverage/**"],
  },

  // Base JS & React Configuration
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      ...eslintReact.configs.recommended.plugins,
      "react-refresh": reactRefresh,
    },
    settings: {
      ...eslintReact.configs.recommended.settings,
    },
    rules: {
      // Base JavaScript recommended rules
      ...js.configs.recommended.rules,

      // React rules (@eslint-react replaces eslint-plugin-react and
      // eslint-plugin-react-hooks; the latter's `rules-of-hooks` and
      // `exhaustive-deps` are part of this preset already).
      ...eslintReact.configs.recommended.rules,

      // Not in the preset, but they are the replacements for the
      // `eslint-plugin-react` rules that the preset does not carry over.
      "@eslint-react/no-missing-component-display-name": "error", // was react/display-name
      "@eslint-react/dom-no-unknown-property": "error", // was react/jsx-no-unknown-property
      "@eslint-react/dom-no-unsafe-target-blank": "error", // was react/jsx-no-target-blank

      // Off: every list keyed by index in this codebase is either static
      // (a plan's feature strings, which never reorder) or a row of identical
      // stateless elements (the device-limit meter). The `item.id ?? index`
      // cases already prefer a real id. The rule's actual hazard -- a stateful
      // child in a list that reorders -- does not occur here.
      "@eslint-react/no-array-index-key": "off",

      // Custom Adjustments
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },

  // Playwright runs in Node while the test files execute in the browser.
  {
    files: ["playwright*.config.js", "e2e/**/*.{js,jsx}"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
];
