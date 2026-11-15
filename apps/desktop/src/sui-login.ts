/** Native Sui Api account login through the hosted BFF and a loopback callback. */
import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { hostname } from 'node:os'

export interface SuiLoginUser {
  readonly id: number
  readonly username: string
  readonly displayName: string
  readonly group: string
}

export interface SuiLoginResult {
  readonly apiKey: string
  readonly baseURL: string
  readonly user: SuiLoginUser
}

export interface SuiLoginOptions {
  /** Hosted BFF origin; defaults to SUI_HARNESS_BFF_URL or the shared Sui Api host. */
  readonly bffUrl?: string
  /** Opens the system browser at the BFF login page. */
  readonly openExternal: (url: string) => Promise<void>
  /** Maximum time for the browser login; defaults to ten minutes. */
  readonly timeoutMs?: number
}

const DEFAULT_BFF = 'https://suiapi.odn.cc'
const CALLBACK_PATH = '/auth/callback'

function deviceName(): string {
  return hostname().replace(/[^A-Za-z0-9._-]/gu, '').slice(0, 30) || 'desktop'
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Open the Sui Api BFF login page and wait for its loopback callback.
 * @param options - BFF origin, browser opener, and login deadline.
 * @returns the device key and safe user metadata; never the New API access token.
 */
export async function loginWithSuiBff(options: SuiLoginOptions): Promise<SuiLoginResult> {
  const bff = (options.bffUrl ?? process.env.SUI_HARNESS_BFF_URL ?? DEFAULT_BFF).replace(/\/+$/u, '')
  const state = randomBytes(24).toString('base64url')
  let settle: ((value: { code: string }) => void) | undefined
  let fail: ((reason: Error) => void) | undefined
  const received = new Promise<{ code: string }>((resolve, reject) => {
    settle = resolve
    fail = reject
  })
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (req.method !== 'GET' || url.pathname !== CALLBACK_PATH) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('Not found')
      return
    }
    const error = url.searchParams.get('error')
    if (error !== null) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('登录未完成，请回到 Sui Harness 重试。')
      fail?.(new Error('Sui login was not completed'))
      return
    }
    if (url.searchParams.get('state') !== state) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('登录状态无效，请回到 Sui Harness 重试。')
      fail?.(new Error('Sui login state mismatch'))
      return
    }
    const code = url.searchParams.get('code')
    if (code === null || code.length < 16) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('登录凭据无效，请回到 Sui Harness 重试。')
      fail?.(new Error('Sui login code is missing'))
      return
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<!doctype html><meta charset="utf-8"><title>Sui Harness</title><body style="font:16px system-ui;background:#0c0d0f;color:#eee;display:grid;place-items:center;height:100vh;margin:0"><div>登录成功，正在返回 Sui Harness…</div></body>')
    settle?.({ code })
  })
  const timeout = setTimeout(() => fail?.(new Error('Sui login timed out')), options.timeoutMs ?? 10 * 60 * 1000)
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('Sui login callback did not bind')
    const redirect = `http://127.0.0.1:${address.port}${CALLBACK_PATH}`
    const start = new URL('/auth/start', bff)
    start.searchParams.set('redirect', redirect)
    start.searchParams.set('state', state)
    start.searchParams.set('device', deviceName())
    await options.openExternal(start.toString())
    const { code } = await received
    const response = await fetch(new URL('/auth/exchange', bff), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, deviceName: deviceName() }),
      signal: AbortSignal.timeout(20_000),
    })
    const body: unknown = await response.json()
    if (!response.ok || !record(body) || body.ok !== true || typeof body.apiKey !== 'string' || body.apiKey.length < 20) {
      throw new Error('Sui login exchange failed')
    }
    const user = record(body.user) ? body.user : {}
    return {
      apiKey: body.apiKey,
      baseURL: typeof body.baseURL === 'string' ? body.baseURL : 'https://suiapi.odn.cc/v1',
      user: {
        id: typeof user.id === 'number' ? user.id : 0,
        username: typeof user.username === 'string' ? user.username : '',
        displayName: typeof user.displayName === 'string' ? user.displayName : '',
        group: typeof user.group === 'string' ? user.group : '',
      },
    }
  } finally {
    clearTimeout(timeout)
    server.close()
  }
}
