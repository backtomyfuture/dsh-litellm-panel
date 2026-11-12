import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/', '.amp/'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'module', globals: globals.node },
  },
  {
    // Executed as a plain script inside the browser, not as an ES module.
    files: ['lib/client.js'],
    languageOptions: { sourceType: 'script', globals: globals.browser },
  },
]
