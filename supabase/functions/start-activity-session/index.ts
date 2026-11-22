// NONPRODUCTION PREPARATION ONLY. Deployment requires a separate approval.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateActivitySessionToken, hashActivitySessionToken } from '../_shared/activitySession.ts'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } })
const origin = 'http://localhost:5173'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const attemptsByIp = new Map<string, { count: number; window: number }>()

function json(body: Record<string, unknown>, status = 200, requestId = '') {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'cache-control': 'no-store',
    'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-correlation-id', ...(requestId ? { 'x-request-id': requestId } : {})
  }})
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()
  if (request.method === 'OPTIONS') return json({}, 204, requestId)
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, requestId)
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 4096) return json({ error: 'request_too_large' }, 413, requestId)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const now = Date.now(); const windowMs = 60_000
  const bucket = attemptsByIp.get(ip)
  if (bucket && now - bucket.window < windowMs && bucket.count >= 10) return json({ error: 'rate_limited' }, 429, requestId)
  if (!bucket || now - bucket.window >= windowMs) attemptsByIp.set(ip, { count: 1, window: now })
  else bucket.count++
  try {
    const body = await request.json() as Record<string, unknown>
    if (typeof body.activity_version_id !== 'string' || !UUID.test(body.activity_version_id)) return json({ error: 'invalid_activity' }, 400, requestId)
    // Provisional nonproduction TTL; final expiry policy remains pending evidence.
    const ttl = Math.max(60, Math.min(7200, Number(Deno.env.get('ACTIVITY_SESSION_TTL_SECONDS') ?? 3600)))
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString()
    const token = generateActivitySessionToken()
    const tokenHash = await hashActivitySessionToken(token)
    const { data, error } = await client.rpc('start_activity_session', {
      p_activity_version_id: body.activity_version_id, p_token_hash: tokenHash,
      // The client cannot choose or extend the activity deadline. The RPC caps
      // these server-generated bounds against the trusted lifecycle registry.
      p_expires_at: expiresAt, p_deadline_at: expiresAt
    })
    if (error) return json({ error: 'session_not_started' }, 409, requestId)
    console.info(JSON.stringify({ event: 'activity_session_issued', request_id: requestId, attempt_id: data.attempt_id, activity_version_id: body.activity_version_id, expires_at: data.expires_at }))
    // Raw token is returned once, never logged or persisted by this function.
    return json({ session_token: token, attempt_id: data.attempt_id, expires_at: data.expires_at }, 201, requestId)
  } catch {
    return json({ error: 'invalid_request' }, 400, requestId)
  }
})
