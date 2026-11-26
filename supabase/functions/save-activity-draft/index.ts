import { createClient } from 'npm:@supabase/supabase-js@2'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } })
const origins = new Set((Deno.env.get('ALLOWED_ORIGINS') ?? 'http://localhost:4173,http://localhost:5173').split(',').map(x => x.trim()).filter(Boolean))
const MAX_BODY_BYTES = 32 * 1024
const MAX_ANSWERS = 50
const MAX_ANSWER_LENGTH = 4_000
const reply = (body: Record<string, unknown>, status = 200, origin = '') => Response.json(body, { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) } })
const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('')
const validPayload = (value: unknown): value is Record<string, string> => Boolean(value) && typeof value === 'object' && !Array.isArray(value) && Object.entries(value as Record<string, unknown>).length <= MAX_ANSWERS && Object.entries(value as Record<string, unknown>).every(([key, answer]) => /^[0-9a-f-]{36}$/i.test(key) && typeof answer === 'string' && answer.length <= MAX_ANSWER_LENGTH)

Deno.serve(async request => {
  const origin = request.headers.get('origin') ?? ''
  const isLocalOrigin = /^http:\/\/localhost(?::\d+)?$/.test(origin)
  if (origin && !origins.has(origin) && !isLocalOrigin) return reply({ error: 'origin_not_allowed' }, 403, origin)
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, apikey, authorization, x-client-info, x-supabase-api-version, x-activity-session', vary: 'Origin' } })
  if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405, origin)
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reply({ error: 'request_too_large' }, 413, origin)
  try {
    const raw = await request.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return reply({ error: 'request_too_large' }, 413, origin)
    const body = JSON.parse(raw) as Record<string, unknown>
    const token = request.headers.get('x-activity-session') ?? ''
    if (!token || typeof body.attempt_id !== 'string' || !validPayload(body.payload)) return reply({ error: 'invalid_request' }, 400, origin)
    const { error } = await client.rpc('save_activity_draft', { p_attempt: body.attempt_id, p_token_hash: await hash(token), p_payload: body.payload })
    return error ? reply({ error: 'draft_rejected' }, 409, origin) : reply({ status: 'saved' }, 200, origin)
  } catch { return reply({ error: 'invalid_request' }, 400, origin) }
})
