/** Sui Api provider seed written into the Desktop profile on first launch. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const PROFILE_PATCH = 'cordis.patch.yml'
const ENTRY_ID = 'llm-pi-ai'

/**
 * Default provider block. The profile patch replaces the base entry's whole
 * config, so this block owns the routes and the default model.
 */
export const SUI_PROFILE_PATCH = `- id: llm-pi-ai
  config:
    providers:
      suiapi:
        displayName: Sui Api
        apiKeyEnv: SUIAPI_API_KEY
        api: openai-completions
        baseURL: https://suiapi.odn.cc/v1
        defaultInput:
          - text
          - image
        compat:
          thinkingFormat: openai
        defaultContextWindow: 1000000
        defaultMaxTokens: 65536
        models:
          - id: deepseek-v4.1-flash
            name: DeepSeek V4.1 Flash
            contextWindow: 100000
            maxTokens: 16000
          - id: Hy4-Free
            name: Hy4 Free
            contextWindow: 960000
            maxTokens: 64000
          - id: SenseNova-6.8-Flash
            name: SenseNova 6.8 Flash
            contextWindow: 262144
            maxTokens: 63999
          - id: Spark-X2.6-Low
            name: Spark X2.6 Low
            contextWindow: 1048576
            maxTokens: 131072
          - id: Spark-X2.6-4B
            name: Spark X2.6 4B
            contextWindow: 1048576
            maxTokens: 131072
          - id: deepseek-v4.1-flash-1017
            name: DeepSeek V4.1 Flash 1017
            contextWindow: 1000000
            maxTokens: 393216
          - id: glm-5.3
            name: GLM 5.3
            contextWindow: 1048576
            maxTokens: 131072
          - id: kimi-k3
            name: Kimi K3
            contextWindow: 1048576
            maxTokens: 100000
          - id: DeepSeek-V4.1-Flash
            name: DeepSeek V4.1 Flash Pro
            contextWindow: 1000000
            maxTokens: 393216
          - id: DeepSeek-V4-Pro
            name: DeepSeek V4 Pro
            contextWindow: 1000000
            maxTokens: 393216
          - id: Kimi-K2.8-Preview
            name: Kimi K2.8 Preview
            contextWindow: 262144
            maxTokens: 64000
          - id: Doubao-Seed-2.1-Pro-solo
            name: Doubao Seed 2.1 Pro
            contextWindow: 256000
            maxTokens: 32000
          - id: Doubao-Seed-Code
            name: Doubao Seed Code
            contextWindow: 256000
            maxTokens: 32000
          - id: MiniMax-M3.1-Flash
            name: MiniMax M3.1 Flash
            contextWindow: 1000000
            maxTokens: 128000
          - id: Step-5-Preview
            name: Step 5 Preview
            contextWindow: 1000000
            maxTokens: 64000

- id: agent-default-model
  config:
    provider: suiapi
    model: deepseek-v4.1-flash
`

const DISABLE_OFFICIAL = `- id: llm-deepseek
  disabled: true

- id: llm-deepseek-account
  disabled: true
`

function hasEntry(source: string, id: string): boolean {
  return source.split(/\r?\n/u).some(line => line.trim() === `- id: ${id}`)
}

/**
 * Seed the Sui Api route, default model and official-provider removal without
 * overwriting an existing user-owned `llm-pi-ai` entry.
 * @param profileDir - Electron-owned Desktop profile directory.
 */
export function seedSuiProfile(profileDir: string): void {
  const path = join(profileDir, PROFILE_PATCH)
  let source = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const empty = source.trim() === '' || source.trim() === '[]'
  if (hasEntry(source, ENTRY_ID)) return
  const block = empty ? SUI_PROFILE_PATCH : `\n${SUI_PROFILE_PATCH}`
  source = empty ? block : `${source.replace(/\s*$/u, '')}\n${block}`
  if (!hasEntry(source, 'llm-deepseek')) source = `${source.replace(/\s*$/u, '')}\n${DISABLE_OFFICIAL}`
  writeFileSync(path, `${source.replace(/\s*$/u, '')}\n`, { mode: 0o600 })
}
