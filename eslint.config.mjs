import {defineConfig, globalIgnores} from "eslint/config"
import globals from "globals"

export default defineConfig([
  globalIgnores(["**/node_modules", "**/coverage", "**/build", "**/lib", "**/typings"]),
  {
    files: ['**/*.js'],
    // 使用的 ESLint 环境
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...globals.node
      }
    },
    // 自定义规则
    rules: {
      'no-undef': 'error',
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
    },
  }
])
