// NONPRODUCTION PREPARATION ONLY. Deployment requires a separate approval.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { generateActivitySessionToken, hashActivitySessionToken } from '../_shared/activitySession.ts'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } })
const DEFAULT_ORIGIN = 'http://localhost:5173'
const allowedOrigins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ORIGIN).split(',').map((value) => value.trim()).filter(Boolean))
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function json(body: Record<string, unknown>, status = 200, requestId = '', requestOrigin = '') {
  return new Response(JSON.stringify(body), { status, headers: {
    'content-type': 'application/json', 'cache-control': 'no-store',
    ...(requestOrigin ? { 'access-control-allow-origin': requestOrigin, vary: 'Origin' } : {}), 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-correlation-id', ...(requestId ? { 'x-request-id': requestId } : {})
  }})
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID()
  const requestOrigin = request.headers.get('origin')
  if (requestOrigin && !allowedOrigins.has(requestOrigin)) return json({ error: 'origin_not_allowed' }, 403, requestId)
  if (request.method === 'OPTIONS') return requestOrigin ? json({}, 204, requestId, requestOrigin) : json({ error: 'origin_not_allowed' }, 403, requestId)
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, requestId, requestOrigin ?? '')
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 4096) return json({ error: 'request_too_large' }, 413, requestId, requestOrigin ?? '')
  try {
    // Supabase's proxy provides this value. Hash it before it reaches the
    // durable rate-limit table so raw network identifiers are never stored.
    const networkSubject = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const subjectHash = await hashActivitySessionToken(networkSubject)
    const { data: allowed, error: rateLimitError } = await client.rpc('consume_activity_session_rate_limit', {
      p_subject_hash: subjectHash,
      p_limit: 10,
    })
    if (rateLimitError) return json({ error: 'temporarily_unavailable' }, 503, requestId, requestOrigin ?? '')
    if (allowed !== true) return json({ error: 'rate_limited' }, 429, requestId, requestOrigin ?? '')
    const body = await request.json() as Record<string, unknown>
    if (typeof body.activity_version_id !== 'string' || !UUID.test(body.activity_version_id) || typeof body.full_name !== 'string' || typeof body.class_name !== 'string' || typeof body.school_name !== 'string') return json({ error: 'invalid_activity' }, 400, requestId, requestOrigin ?? '')
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
    if (error) return json({ error: 'session_not_started' }, 409, requestId, requestOrigin ?? '')
    const identity = await client.rpc('identify_activity_attempt', { p_attempt: data.attempt_id, p_token_hash: tokenHash, p_full_name: body.full_name, p_class: body.class_name, p_school: body.school_name })
    if (identity.error) return json({ error: 'identity_rejected' }, 400, requestId, requestOrigin ?? '')
    console.info(JSON.stringify({ event: 'activity_session_issued', request_id: requestId, attempt_id: data.attempt_id, activity_version_id: body.activity_version_id, expires_at: data.expires_at }))
    // Raw token is returned once, never logged or persisted by this function.
    return json({ session_token: token, attempt_id: data.attempt_id, expires_at: data.expires_at }, 201, requestId, requestOrigin ?? '')
  } catch {
    return json({ error: 'invalid_request' }, 400, requestId, requestOrigin ?? '')
  }
})
