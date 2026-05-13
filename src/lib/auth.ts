const CLIENT_ID     = import.meta.env.VITE_GOOGLE_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET

export const hasClientId = !!CLIENT_ID

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

function redirectUri(): string {
  // BASE_URL is '/' in dev and '/stempel/' on GitHub Pages
  return window.location.origin + import.meta.env.BASE_URL
}

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateVerifier(): string {
  const buf = new Uint8Array(32)
  crypto.getRandomValues(buf)
  return base64url(buf.buffer)
}

async function generateChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

export async function startOAuthFlow(): Promise<void> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  const verifier = generateVerifier()
  const challenge = await generateChallenge(verifier)
  sessionStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    access_type: 'offline',
    prompt: 'consent',
  })
  window.location.href = `${AUTH_ENDPOINT}?${params}`
}

export async function exchangeCode(
  code: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID not set')

  const verifier = sessionStorage.getItem('pkce_verifier') ?? ''
  sessionStorage.removeItem('pkce_verifier')

  if (!verifier) throw new Error('PKCE verifier missing from sessionStorage — did the OAuth tab change?')

  const body: Record<string, string> = {
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
  }
  // Google requires client_secret for "Web application" OAuth clients
  if (CLIENT_SECRET) body.client_secret = CLIENT_SECRET

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  const data = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    error?: string
    error_description?: string
  }
  if (!data.access_token) {
    const msg = [data.error, data.error_description].filter(Boolean).join(': ')
    console.error('[auth] token exchange failed', data)
    throw new Error(msg || 'Token exchange failed')
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token ?? '' }
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID not set')
  const refreshBody: Record<string, string> = {
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  }
  if (CLIENT_SECRET) refreshBody.client_secret = CLIENT_SECRET

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(refreshBody),
  })
  const data = (await res.json()) as { access_token?: string; error?: string }
  if (!data.access_token) throw new Error(data.error ?? 'Refresh failed')
  return data.access_token
}

export async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
  })
}
