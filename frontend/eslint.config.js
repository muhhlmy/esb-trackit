import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

export default defineConfig([
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,js,mjs,jsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  {
    files: ['vite.config.js', '*.config.{js,mjs}', 'tests/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  // Vue <script setup> uses defineProps to create variables — disable no-undef
  // for .vue files; eslint-plugin-vue's vue/no-undef-properties covers it.
  {
    files: ['**/*.vue'],
    rules: {
      'no-undef': 'off',
    },
  },

  pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
])
