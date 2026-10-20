import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Enabled by `react-hooks` v6's recommended set. Every occurrence in this
      // app is one of two shapes: an effect kicks off a fetch and flips a loading
      // flag, or `useChartTheme` re-reads CSS custom properties after the theme
      // class changes. Both are the "synchronise with an external system" case
      // the rule's own docs permit, and neither has a rewrite that stops short of
      // adopting a data-fetching library. Turned off in one place with a reason,
      // rather than as a dozen scattered per-line disables.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Two module shapes the rule can't recognise, both deliberate:
    //  - a `ui/` primitive exported alongside the class-string factory or Radix
    //    alias that belongs to it (`buttonClass`, `ModalClose`);
    //  - a context module exporting its provider together with the hook that
    //    reads it — which is the entire point of the module.
    // Splitting either to buy hot-reload granularity is the wrong trade.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/context/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: [
            'buttonClass',
            'inputClass',
            'Menu',
            'MenuTrigger',
            'ModalClose',
            'useAuth',
          ],
        },
      ],
    },
  },
])
