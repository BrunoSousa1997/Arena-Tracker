import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// A app tem TRÊS ambientes de execução diferentes no mesmo repositório, e cada
// um tem globais próprias — um só bloco com globals.browser (como estava aqui
// antes) dava ~146 "no-undef" falsos, todos em código de processo principal a
// usar require/module/__dirname legitimamente. Daí a divisão por pasta abaixo.
export default defineConfig([
  // dist/ e release/ são gerados; .claude/ guarda worktrees com cópias
  // inteiras do projeto, e lintá-las reportava cada problema três vezes.
  globalIgnores(['dist', 'release', 'build', '.claude', 'public']),

  // ================= RENDERER (src/) =================
  {
    files: ['src/**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // As regras abaixo vêm do eslint-plugin-react-hooks v6 e são conselhos
      // de preparação para o React Compiler, não defeitos de correção. O
      // código tem ~55 casos herdados (sobretudo setState dentro de efeitos
      // de sincronização, que é o padrão de toda a deteção ao vivo) e
      // tratá-los como erro deixaria o "npm run lint" permanentemente
      // vermelho — e portanto ignorado, que é pior do que não o ter.
      // Ficam como AVISO: aparecem, dá para ir reduzindo, mas não bloqueiam.
      // O "rules-of-hooks" fica de propósito em erro: esse é correção a
      // sério (ordem dos hooks) e está a zero.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },

  // ================= TESTES (Vitest) =================
  // Importam describe/it/expect explicitamente (sem "globals: true" na
  // config do Vitest), por isso não precisam de globais extra — só de poder
  // usar as de Node, que alguns usam para mexer em datas/temporizadores.
  {
    files: ['src/**/*.test.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ================= PROCESSO PRINCIPAL (Electron, CommonJS) =================
  // scripts/ entra aqui porque corre no mesmo ambiente: processo principal do
  // Electron, CommonJS, globais de Node (ver scripts/verify-platform.js).
  {
    files: ['electron.js', 'preload.js', 'electron/**/*.js', 'scripts/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.commonjs },
    },
  },

  // ================= CLOUDFLARE WORKER =================
  // "export default { fetch }" — ESM, e as globais são as de Service Worker
  // (fetch, Request, Response, Headers, URL), não as de Node nem de browser.
  {
    files: ['riot-proxy/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.serviceworker,
    },
  },

  // ================= ESTE PRÓPRIO FICHEIRO E OUTROS CONFIGS =================
  {
    files: ['*.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
  },
])
